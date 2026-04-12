import express, { Express, Request, Response, NextFunction } from 'express';
import http, { Server as HttpServer } from 'http';
import os from 'os';
import path from 'path';
import { Server as SocketIOServer, Socket } from 'socket.io';
import type { AppEvent } from './twitch/messageParser';

export interface GatewayStatus {
    running: boolean;
    port: number;
    // true if config.authToken is a non-empty string — UI uses this to
    // gate the Start button.
    authTokenSet: boolean;
    // The token itself — shown in the desktop settings page so the
    // user can read it aloud or type it on the phone if QR is not an
    // option. Short enough (8 chars) to be human-friendly.
    authToken: string;
    // true if config.staticDir was resolved to a real directory at
    // service construction time.
    staticDirPresent: boolean;
    // Enumerated LAN URLs the phone can hit. IPv4-only, external
    // interfaces only. Empty while the service is not running.
    lanUrls: string[];
}

// Walk os.networkInterfaces() for non-internal IPv4 entries and format
// each as http://<ip>:<port>/[?token=...]. Used by the desktop
// settings page to show the user which URL to type (or QR-scan) from
// the phone. When a token is passed, it is embedded in the query so
// the PWA can auto-login on first load — trading some hygiene (token
// in URL history) for a zero-keystroke onboarding path.
export function listLanUrls(port: number, token?: string | null): string[] {
    const entries: { address: string; priority: number }[] = [];
    const suffix = token ? `?token=${encodeURIComponent(token)}` : '';
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        const list = interfaces[name] || [];
        for (const iface of list) {
            if (iface.family !== 'IPv4') continue;
            if (iface.internal) continue;
            // Home-network 192.168.0.0/16 gets top priority, then
            // 10.0.0.0/8 and 172.16-31.x.x, then everything else.
            let priority = 2;
            if (iface.address.startsWith('192.168.')) priority = 0;
            else if (iface.address.startsWith('10.') || iface.address.startsWith('172.')) priority = 1;
            entries.push({ address: iface.address, priority });
        }
    }
    entries.sort((a, b) => a.priority - b.priority);
    return entries.map((e) => `http://${e.address}:${port}/${suffix}`);
}

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
    sendShoutout: (userId: string) => Promise<void>;
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
    // Absolute path to a built PWA bundle (e.g. repo/dist-pwa). When
    // set, the gateway serves the bundle at /* with an SPA index.html
    // fallback so the phone can hit http://<lan-ip>:42010/ directly.
    // When null/undefined, the gateway returns 404 for non-API paths.
    staticDir?: string | null;
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

export class RemoteGatewayService {
    private readonly config: RemoteGatewayConfig;
    private readonly deps: RemoteGatewayDeps;

    private httpServer: HttpServer | null = null;
    private io: SocketIOServer | null = null;
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
        const server = http.createServer(app);
        this.setupSocketIO(server);

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
        if (this.io) {
            this.io.disconnectSockets(true);
            await new Promise<void>((resolve) => this.io!.close(() => resolve()));
            this.io = null;
        }
        if (this.httpServer) {
            await new Promise<void>((resolve) => this.httpServer!.close(() => resolve()));
            this.httpServer = null;
        }
    }

    isRunning(): boolean {
        return this.httpServer !== null;
    }

    getStatus(): GatewayStatus {
        return {
            running: this.isRunning(),
            port: this.config.port,
            authTokenSet: !!this.config.authToken,
            authToken: this.config.authToken ?? '',
            staticDirPresent: !!this.config.staticDir,
            lanUrls: this.isRunning() ? listLanUrls(this.config.port, this.config.authToken) : [],
        };
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

        apiRouter.post('/users/:id/shoutout', this.wrap(async (req, res) => {
            await this.deps.moderation.sendShoutout(req.params.id);
            res.status(204).end();
        }));

        // Any /api/* path that did not match a route above is a real
        // 404. Without this, unmatched API requests would fall through
        // to the static serving layer below and get silently served
        // the SPA index.html, which is both misleading and a security
        // smell (leaking the shell of the app on invalid auth scopes).
        apiRouter.use((_req, res) => {
            res.status(404).json({ error: 'not found' });
        });

        app.use('/api', apiRouter);

        // PWA static serving. Mounted after /api so there is no way
        // for a file at `dist-pwa/api/foo` to shadow a real endpoint.
        const staticDir = this.config.staticDir;
        if (staticDir) {
            // index.html must NEVER be cached — asset files have
            // content-hashed names so they're fine, but the shell
            // references the current hash and needs to be fresh on
            // every reload or PWA updates silently break.
            app.use(express.static(staticDir, {
                index: 'index.html',
                setHeaders: (res, filePath) => {
                    if (filePath.endsWith('index.html')) {
                        res.setHeader('Cache-Control', 'no-store');
                    }
                },
            }));
            app.use((req, res, next) => {
                if (req.method !== 'GET' && req.method !== 'HEAD') return next();
                // Reserved paths that must never be rewritten to the
                // SPA shell: API, WebSocket, and health checks.
                if (req.path.startsWith('/api/') || req.path === '/api'
                    || req.path.startsWith('/ws/') || req.path === '/health') {
                    return next();
                }
                res.setHeader('Cache-Control', 'no-store');
                res.sendFile(path.join(staticDir, 'index.html'), (err) => {
                    if (err) next(err);
                });
            });
        }

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

    private setupSocketIO(server: HttpServer): void {
        const io = new SocketIOServer(server, {
            // Allow both polling and websocket — polling is the iOS
            // Safari fallback that makes the whole feature work.
            transports: ['polling', 'websocket'],
            cors: { origin: '*', methods: ['GET', 'POST'] },
            path: '/ws',
            // Ping/pong keeps the connection alive and detects dead
            // clients faster than TCP keepalive alone.
            pingInterval: 10000,
            pingTimeout: 5000,
        });
        this.io = io;

        // Auth middleware — runs once per connection attempt. Checks
        // ?token= in the handshake query (set by the PWA client).
        io.use((socket, next) => {
            const expected = this.config.authToken;
            if (!expected) return next(new Error('no auth token configured'));
            const provided = socket.handshake.auth?.token
                || socket.handshake.query?.token;
            if (provided === expected) return next();
            console.log(`[gw] → 401 from ${socket.handshake.address}`);
            return next(new Error('unauthorized'));
        });

        io.on('connection', (socket: Socket) => {
            console.log(`[gw] client connected: ${socket.handshake.address}, transport=${socket.conn.transport.name}, total=${io.engine.clientsCount}`);

            // Log transport upgrades (polling → websocket).
            socket.conn.on('upgrade', (transport: any) => {
                console.log(`[gw] client ${socket.id} upgraded to ${transport.name}`);
            });

            // Send initial snapshot.
            try {
                const snapshot = this.deps.getWindowCache();
                socket.emit('chat:snapshot', {
                    messages: snapshot.messages,
                    showSourceChannel: snapshot.showSourceChannel,
                });
            } catch (err) {
                console.error('❌ Remote gateway initial snapshot failed:', err);
            }

            socket.on('disconnect', (reason) => {
                console.log(`[gw] client disconnected: ${reason}, remaining=${io.engine.clientsCount}`);
            });
        });
    }

    private subscribeToCache(): void {
        this.unsubscribeWindow = this.deps.subscribeWindow((data) => {
            if (!this.io) return;
            this.io.emit('chat:update', {
                messages: data.messages,
                showSourceChannel: data.showSourceChannel,
            });
        });
    }
}
