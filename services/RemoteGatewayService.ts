import express, { Express, Request, Response, NextFunction } from 'express';
import http, { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type { AppEvent } from './twitch/messageParser';

// Wire-format DTO the gateway returns to clients. Intentionally
// decoupled from the internal ExtendedTwitchUser shape so backend
// refactors don't leak into the PWA.
export interface GatewayUserProfile {
    id: string;
    login: string;
    displayName: string;
    profileImageUrl: string | null;
    createdAt: string;
    isModerator: boolean;
    isVip: boolean;
    isFollower: boolean;
    followedAt: string | null;
    isBanned: boolean;
    banExpiresAt: string | null;
}

export interface ModerationDeps {
    getUserById: (id: string) => Promise<GatewayUserProfile>;
    getUserByLogin: (login: string) => Promise<GatewayUserProfile>;
    // null duration = permanent ban; positive integer = timeout seconds.
    timeoutUser: (userId: string, duration: number | null, reason: string) => Promise<void>;
    unbanUser: (userId: string) => Promise<void>;
    // Diff-based: the gateway computes current state and passes the
    // before/after pair down. Adapter translates to the repo's
    // updateRoles({ current, update }) shape.
    setUserRoles: (userId: string, target: { isMod?: boolean; isVip?: boolean }) => Promise<void>;
    deleteMessage: (messageId: string) => Promise<void>;
}

// Plain DTOs — the service intentionally does not import from
// electron-store or electron itself, so it is unit-testable without
// mocking the Electron runtime. main.ts is the only layer that reads
// the real store and passes plain values in.
export interface RemoteGatewayConfig {
    port: number;
    // null means no valid token is configured — the service will then
    // reject every WebSocket upgrade attempt. This is deliberately
    // fail-closed so a misconfigured dev env cannot accidentally expose
    // the chat stream to the LAN unauthenticated.
    authToken: string | null;
}

export interface WindowCacheSnapshot {
    messages: AppEvent[];
    showSourceChannel: boolean;
}

export type WindowListener = (data: WindowCacheSnapshot) => void;

export interface RemoteGatewayDeps {
    getWindowCache: () => WindowCacheSnapshot;
    // Returns an unsubscribe function so the service can clean up when
    // stopped without the caller having to remember the listener ref.
    subscribeWindow: (listener: WindowListener) => () => void;
    moderation: ModerationDeps;
}

type OutgoingMessage =
    | { type: 'chat:snapshot'; messages: AppEvent[]; showSourceChannel: boolean }
    | { type: 'chat:update'; messages: AppEvent[]; showSourceChannel: boolean };

export class RemoteGatewayService {
    private readonly config: RemoteGatewayConfig;
    private readonly deps: RemoteGatewayDeps;

    private httpServer: HttpServer | null = null;
    private wss: WebSocketServer | null = null;
    private readonly chatClients: Set<WebSocket> = new Set();
    private unsubscribeWindow: (() => void) | null = null;

    constructor(config: RemoteGatewayConfig, deps: RemoteGatewayDeps) {
        this.config = config;
        this.deps = deps;
    }

    async start(): Promise<{ port: number }> {
        if (this.httpServer) {
            throw new Error('RemoteGatewayService is already started');
        }
        const app = this.buildHttpApp();
        // Use http.createServer directly so the upgrade handler is
        // installed *before* the server starts listening. Mounting via
        // app.listen(...) would install upgrade handling inside the
        // listen callback, which is both racy and hides the raw server.
        const server = http.createServer(app);
        this.setupWebSocket(server);

        return new Promise<{ port: number }>((resolve, reject) => {
            const onError = (err: Error) => {
                server.removeListener('listening', onListening);
                reject(err);
            };
            const onListening = () => {
                server.removeListener('error', onError);
                const address = server.address();
                const actualPort = typeof address === 'object' && address ? address.port : this.config.port;
                this.httpServer = server;
                this.subscribeToCache();
                console.log(`🛰️  Remote gateway listening on 0.0.0.0:${actualPort}`);
                resolve({ port: actualPort });
            };
            server.once('error', onError);
            server.once('listening', onListening);
            server.listen(this.config.port, '0.0.0.0');
        });
    }

    async stop(): Promise<void> {
        if (this.unsubscribeWindow) {
            this.unsubscribeWindow();
            this.unsubscribeWindow = null;
        }
        for (const client of this.chatClients) {
            try { client.close(); } catch { /* ignore */ }
        }
        this.chatClients.clear();
        if (this.wss) {
            await new Promise<void>((resolve) => this.wss!.close(() => resolve()));
            this.wss = null;
        }
        if (this.httpServer) {
            await new Promise<void>((resolve) => this.httpServer!.close(() => resolve()));
            this.httpServer = null;
        }
    }

    isRunning(): boolean {
        return this.httpServer !== null;
    }

    private buildHttpApp(): Express {
        const app = express();

        // Permissive CORS for the LAN-only PWA. The gateway already
        // fails closed on auth, so a wide-open origin policy is fine
        // here — the real access control is the bearer token, not the
        // Origin header. Echo the requesting origin (not '*') so that
        // if we ever need credentials later, the header stays valid.
        app.use((req, res, next) => {
            const origin = req.headers.origin;
            if (typeof origin === 'string' && origin.length > 0) {
                res.setHeader('Access-Control-Allow-Origin', origin);
                res.setHeader('Vary', 'Origin');
            } else {
                res.setHeader('Access-Control-Allow-Origin', '*');
            }
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
            res.setHeader('Access-Control-Max-Age', '600');
            if (req.method === 'OPTIONS') {
                res.status(204).end();
                return;
            }
            next();
        });

        app.use(express.json({ limit: '64kb' }));

        app.get('/health', (_req, res) => {
            res.json({ ok: true, gateway: 'remote-companion', version: 1 });
        });

        const apiRouter = express.Router();
        apiRouter.use((req, res, next) => this.apiAuthMiddleware(req, res, next));

        // Profile lookups. `by-login` is a separate route so IDs and
        // login slugs don't collide on path param ambiguity.
        apiRouter.get('/users/by-login/:login', this.wrap(async (req, res) => {
            const profile = await this.deps.moderation.getUserByLogin(req.params.login);
            res.json(profile);
        }));
        apiRouter.get('/users/:id', this.wrap(async (req, res) => {
            const profile = await this.deps.moderation.getUserById(req.params.id);
            res.json(profile);
        }));

        // Moderation actions. All write-side endpoints return 204 on
        // success — no body, since the client will re-fetch the profile
        // if it needs updated state.
        apiRouter.post('/users/:id/timeout', this.wrap(async (req, res) => {
            const duration = this.parseDuration(req.body?.duration);
            const reason = typeof req.body?.reason === 'string' ? req.body.reason : '';
            await this.deps.moderation.timeoutUser(req.params.id, duration, reason);
            res.status(204).end();
        }));

        apiRouter.post('/users/:id/unban', this.wrap(async (req, res) => {
            await this.deps.moderation.unbanUser(req.params.id);
            res.status(204).end();
        }));

        apiRouter.post('/users/:id/roles', this.wrap(async (req, res) => {
            const body = req.body ?? {};
            const target: { isMod?: boolean; isVip?: boolean } = {};
            if (typeof body.isMod === 'boolean') target.isMod = body.isMod;
            if (typeof body.isVip === 'boolean') target.isVip = body.isVip;
            if (target.isMod === undefined && target.isVip === undefined) {
                res.status(400).json({ error: 'Body must include isMod and/or isVip as booleans' });
                return;
            }
            await this.deps.moderation.setUserRoles(req.params.id, target);
            res.status(204).end();
        }));

        apiRouter.delete('/messages/:messageId', this.wrap(async (req, res) => {
            await this.deps.moderation.deleteMessage(req.params.messageId);
            res.status(204).end();
        }));

        app.use('/api', apiRouter);

        // Centralised error handler — any throw from a route handler
        // lands here via next(err). Logged once, mapped to a generic
        // 500 so internal errors never leak to the mobile client.
        app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
            console.error('❌ Remote gateway request failed:', err?.message ?? err);
            if (res.headersSent) return;
            res.status(500).json({ error: 'internal error' });
        });

        return app;
    }

    // Tiny wrapper so async route handlers can throw without each one
    // needing its own try/catch.
    private wrap(handler: (req: Request, res: Response) => Promise<void>) {
        return (req: Request, res: Response, next: NextFunction) => {
            handler(req, res).catch(next);
        };
    }

    private parseDuration(raw: unknown): number | null {
        if (raw === null || raw === undefined) return null;
        if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return Math.floor(raw);
        return null;
    }

    private apiAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
        const expected = this.config.authToken;
        if (!expected) {
            res.status(401).json({ error: 'gateway has no auth token configured' });
            return;
        }
        const raw = req.headers['authorization'];
        const header = Array.isArray(raw) ? raw[0] : raw;
        if (header && header.startsWith('Bearer ')) {
            const token = header.slice('Bearer '.length).trim();
            if (token === expected) { next(); return; }
        }
        // Fall-back: ?token=... for clients that can't set headers (PWA
        // dev-tools, QR-scanned URLs). Same token value, just different
        // transport.
        const fromQuery = typeof req.query?.token === 'string' ? req.query.token : null;
        if (fromQuery && fromQuery === expected) { next(); return; }

        res.status(401).json({ error: 'unauthorized' });
    }

    private setupWebSocket(server: HttpServer): void {
        const wss = new WebSocketServer({ noServer: true });
        this.wss = wss;

        server.on('upgrade', (req, socket, head) => {
            let url: URL;
            try {
                url = new URL(req.url ?? '/', 'http://localhost');
            } catch {
                socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
                socket.destroy();
                return;
            }

            if (url.pathname !== '/ws/chat') {
                socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
                socket.destroy();
                return;
            }

            if (!this.isAuthorized(url, req.headers)) {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }

            wss.handleUpgrade(req, socket, head, (ws) => {
                this.handleChatConnection(ws);
            });
        });
    }

    // Auth lookup order: ?token=... query param (easy from a PWA or
    // wscat-style client) → Authorization: Bearer ... header (for more
    // formal clients). Fail closed if neither is present or matches.
    private isAuthorized(url: URL, headers: NodeJS.Dict<string | string[]>): boolean {
        const expected = this.config.authToken;
        if (!expected) return false;

        const fromQuery = url.searchParams.get('token');
        if (fromQuery && fromQuery === expected) return true;

        const rawAuth = headers['authorization'];
        const auth = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;
        if (auth && auth.startsWith('Bearer ')) {
            const fromHeader = auth.slice('Bearer '.length).trim();
            if (fromHeader === expected) return true;
        }

        return false;
    }

    private handleChatConnection(ws: WebSocket): void {
        this.chatClients.add(ws);

        try {
            const snapshot = this.deps.getWindowCache();
            const msg: OutgoingMessage = {
                type: 'chat:snapshot',
                messages: snapshot.messages,
                showSourceChannel: snapshot.showSourceChannel,
            };
            ws.send(JSON.stringify(msg));
        } catch (err) {
            console.error('❌ Remote gateway initial snapshot failed:', err);
        }

        ws.on('close', () => {
            this.chatClients.delete(ws);
        });
        ws.on('error', (err) => {
            console.error('❌ Remote gateway chat ws error:', err);
        });
    }

    private subscribeToCache(): void {
        this.unsubscribeWindow = this.deps.subscribeWindow((data) => {
            if (this.chatClients.size === 0) return;
            const msg: OutgoingMessage = {
                type: 'chat:update',
                messages: data.messages,
                showSourceChannel: data.showSourceChannel,
            };
            const payload = JSON.stringify(msg);
            for (const client of this.chatClients) {
                if (client.readyState === client.OPEN) {
                    try { client.send(payload); } catch { /* ignore per-client errors */ }
                }
            }
        });
    }
}
