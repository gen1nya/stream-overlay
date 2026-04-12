import express, { Express } from 'express';
import http, { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type { AppEvent } from './twitch/messageParser';

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
        app.get('/health', (_req, res) => {
            res.json({ ok: true, gateway: 'remote-companion', version: 1 });
        });
        return app;
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
