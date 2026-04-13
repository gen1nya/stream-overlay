import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { io, Socket } from 'socket.io-client';
import fs from 'fs';
import path from 'path';
import os from 'os';
import type { AppEvent } from './twitch/messageParser';
import {
    RemoteGatewayService,
    listLanUrls,
    type RemoteGatewayConfig,
    type RemoteGatewayDeps,
    type ModerationDeps,
    type GatewayUserProfile,
    type WindowCacheSnapshot,
    type WindowListener,
} from './RemoteGatewayService';

function makeProfile(overrides: Partial<GatewayUserProfile> = {}): GatewayUserProfile {
    return {
        id: '12345',
        login: 'alice',
        displayName: 'Alice',
        profileImageUrl: null,
        createdAt: '2020-01-01T00:00:00Z',
        isModerator: false,
        isVip: false,
        isFollower: true,
        followedAt: '2021-05-10T00:00:00Z',
        isBanned: false,
        banExpiresAt: null,
        ...overrides,
    };
}

function createFakeModeration(): ModerationDeps & { calls: Record<string, any[]> } {
    const calls: Record<string, any[]> = {
        getUserById: [],
        getUserByLogin: [],
        timeoutUser: [],
        unbanUser: [],
        setUserRoles: [],
        deleteMessage: [],
        sendShoutout: [],
    };
    return {
        calls,
        async getUserById(id) { calls.getUserById.push({ id }); return makeProfile({ id }); },
        async getUserByLogin(login) { calls.getUserByLogin.push({ login }); return makeProfile({ login }); },
        async timeoutUser(userId, duration, reason) { calls.timeoutUser.push({ userId, duration, reason }); },
        async unbanUser(userId) { calls.unbanUser.push({ userId }); },
        async setUserRoles(userId, target) { calls.setUserRoles.push({ userId, target }); },
        async deleteMessage(messageId) { calls.deleteMessage.push({ messageId }); },
        async sendShoutout(userId) { calls.sendShoutout.push({ userId }); },
    };
}

function makeChat(id: string): AppEvent {
    return {
        type: 'message',
        id,
        userId: 'u1',
        userName: 'alice',
        userNameRaw: 'alice',
        htmlMessage: `<span>${id}</span>`,
        roles: {},
        timestamp: Date.now(),
        color: '#fff',
    } as unknown as AppEvent;
}

interface FakeCacheHandle {
    cache: WindowCacheSnapshot;
    push: (ev: AppEvent) => void;
    deps: RemoteGatewayDeps;
    listenerCount: () => number;
    moderation: ReturnType<typeof createFakeModeration>;
}

// Tiny in-memory stand-in for MessageCacheManager — lets the test
// inject messages and count subscribers without depending on the real
// module's global state.
function createFakeCache(initial: AppEvent[] = []): FakeCacheHandle {
    const cache: WindowCacheSnapshot = {
        messages: [...initial],
        showSourceChannel: false,
    };
    const listeners: Set<WindowListener> = new Set();
    const moderation = createFakeModeration();

    const deps: RemoteGatewayDeps = {
        getWindowCache: () => ({ messages: [...cache.messages], showSourceChannel: cache.showSourceChannel }),
        subscribeWindow: (listener) => {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
        moderation,
    };

    return {
        cache,
        push: (ev) => {
            cache.messages.push(ev);
            for (const l of listeners) {
                l({ messages: [...cache.messages], showSourceChannel: cache.showSourceChannel });
            }
        },
        deps,
        listenerCount: () => listeners.size,
        moderation,
    };
}

function makeConfig(overrides: Partial<RemoteGatewayConfig> = {}): RemoteGatewayConfig {
    return {
        port: 0, // ephemeral — OS picks a free port
        authToken: 'test-token',
        ...overrides,
    };
}

// Socket.IO test helpers. Buffered message queue so tests can await
// events without races.
interface Client {
    socket: Socket;
    nextEvent: (event: string) => Promise<any>;
    disconnect: () => void;
}

function connectSocket(baseUrl: string, token: string): Promise<Client> {
    return new Promise((resolve, reject) => {
        const queues: Record<string, any[]> = {};
        const waiters: Record<string, Array<(data: any) => void>> = {};

        const socket = io(baseUrl, {
            path: '/ws',
            auth: { token },
            transports: ['polling', 'websocket'],
            reconnection: false,
            timeout: 3000,
        });

        socket.onAny((event: string, data: any) => {
            const q = queues[event] ??= [];
            const w = waiters[event] ??= [];
            const waiter = w.shift();
            if (waiter) waiter(data);
            else q.push(data);
        });

        socket.on('connect', () => resolve({
            socket,
            nextEvent: (event: string) => new Promise((res) => {
                const q = queues[event] ??= [];
                const w = waiters[event] ??= [];
                if (q.length > 0) res(q.shift());
                else w.push(res);
            }),
            disconnect: () => socket.disconnect(),
        }));
        socket.on('connect_error', (err) => {
            socket.disconnect();
            reject(err);
        });
    });
}

function expectSocketReject(baseUrl: string, token: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const socket = io(baseUrl, {
            path: '/ws',
            auth: { token },
            transports: ['polling', 'websocket'],
            reconnection: false,
            timeout: 3000,
        });
        socket.on('connect', () => {
            socket.disconnect();
            reject(new Error('expected socket to be rejected, but it connected'));
        });
        socket.on('connect_error', () => {
            socket.disconnect();
            resolve();
        });
    });
}

describe('RemoteGatewayService', () => {
    let service: RemoteGatewayService | null = null;
    let cache: FakeCacheHandle;
    let port: number;

    beforeEach(async () => {
        cache = createFakeCache([makeChat('existing-1'), makeChat('existing-2')]);
        service = new RemoteGatewayService(makeConfig(), cache.deps);
        const { port: actual } = await service.start();
        port = actual;
    });

    afterEach(async () => {
        if (service) {
            await service.stop();
            service = null;
        }
    });

    it('binds to an ephemeral port and exposes /health', async () => {
        const res = await fetch(`http://127.0.0.1:${port}/health`);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toMatchObject({ ok: true, gateway: 'remote-companion' });
    });

    it('rejects connection without a token', async () => {
        await expectSocketReject(`http://127.0.0.1:${port}`, '');
    });

    it('rejects connection with a wrong token', async () => {
        await expectSocketReject(`http://127.0.0.1:${port}`, 'nope');
    });

    it('accepts connection with correct token and delivers initial snapshot', async () => {
        const client = await connectSocket(`http://127.0.0.1:${port}`, 'test-token');
        const data = await client.nextEvent('chat:snapshot');
        expect(data.messages).toHaveLength(2);
        expect(data.messages.map((m: AppEvent) => m.id)).toEqual(['existing-1', 'existing-2']);
        client.disconnect();
    });

    it('pushes live chat:update to all connected clients', async () => {
        const a = await connectSocket(`http://127.0.0.1:${port}`, 'test-token');
        const b = await connectSocket(`http://127.0.0.1:${port}`, 'test-token');
        await a.nextEvent('chat:snapshot');
        await b.nextEvent('chat:snapshot');

        cache.push(makeChat('live-1'));

        const msgA = await a.nextEvent('chat:update');
        const msgB = await b.nextEvent('chat:update');
        expect(msgA.messages.map((m: AppEvent) => m.id)).toContain('live-1');
        expect(msgB.messages.map((m: AppEvent) => m.id)).toContain('live-1');

        a.disconnect();
        b.disconnect();
    });

    it('unsubscribes from the cache on stop', async () => {
        expect(cache.listenerCount()).toBe(1);
        await service!.stop();
        service = null;
        expect(cache.listenerCount()).toBe(0);
    });

    it('handles disconnect gracefully', async () => {
        const client = await connectSocket(`http://127.0.0.1:${port}`, 'test-token');
        await client.nextEvent('chat:snapshot');
        client.disconnect();
        await new Promise((r) => setTimeout(r, 50));

        cache.push(makeChat('post-close'));
        await new Promise((r) => setTimeout(r, 20));

        const alive = await connectSocket(`http://127.0.0.1:${port}`, 'test-token');
        const data = await alive.nextEvent('chat:snapshot');
        expect(data.messages).toHaveLength(3); // existing-1, existing-2, post-close
        alive.disconnect();
    });
});

describe('RemoteGatewayService moderation API', () => {
    let service: RemoteGatewayService | null = null;
    let cache: FakeCacheHandle;
    let port: number;

    beforeEach(async () => {
        cache = createFakeCache();
        service = new RemoteGatewayService(makeConfig(), cache.deps);
        const { port: actual } = await service.start();
        port = actual;
    });

    afterEach(async () => {
        if (service) {
            await service.stop();
            service = null;
        }
    });

    const authHeaders = { Authorization: 'Bearer test-token' };

    it('rejects /api/users/:id without token with 401', async () => {
        const res = await fetch(`http://127.0.0.1:${port}/api/users/42`);
        expect(res.status).toBe(401);
    });

    it('rejects /api/users/:id with a wrong token', async () => {
        const res = await fetch(`http://127.0.0.1:${port}/api/users/42`, {
            headers: { Authorization: 'Bearer nope' },
        });
        expect(res.status).toBe(401);
    });

    it('accepts ?token= query param for /api/users/:id', async () => {
        const res = await fetch(`http://127.0.0.1:${port}/api/users/42?token=test-token`);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.id).toBe('42');
    });

    it('GET /api/users/:id returns a normalized profile', async () => {
        const res = await fetch(`http://127.0.0.1:${port}/api/users/777`, { headers: authHeaders });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toMatchObject({
            id: '777',
            login: 'alice',
            isModerator: false,
            isVip: false,
            isFollower: true,
        });
        expect(cache.moderation.calls.getUserById).toEqual([{ id: '777' }]);
    });

    it('GET /api/users/by-login/:login resolves via login', async () => {
        const res = await fetch(`http://127.0.0.1:${port}/api/users/by-login/alice`, { headers: authHeaders });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.login).toBe('alice');
        expect(cache.moderation.calls.getUserByLogin).toEqual([{ login: 'alice' }]);
    });

    it('POST /api/users/:id/timeout forwards duration and reason', async () => {
        const res = await fetch(`http://127.0.0.1:${port}/api/users/555/timeout`, {
            method: 'POST',
            headers: { ...authHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ duration: 600, reason: 'spamming' }),
        });
        expect(res.status).toBe(204);
        expect(cache.moderation.calls.timeoutUser).toEqual([
            { userId: '555', duration: 600, reason: 'spamming' },
        ]);
    });

    it('POST /api/users/:id/timeout without duration = permanent ban', async () => {
        const res = await fetch(`http://127.0.0.1:${port}/api/users/555/timeout`, {
            method: 'POST',
            headers: { ...authHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'banned forever' }),
        });
        expect(res.status).toBe(204);
        expect(cache.moderation.calls.timeoutUser).toEqual([
            { userId: '555', duration: null, reason: 'banned forever' },
        ]);
    });

    it('POST /api/users/:id/unban calls through to the dep', async () => {
        const res = await fetch(`http://127.0.0.1:${port}/api/users/555/unban`, {
            method: 'POST',
            headers: authHeaders,
        });
        expect(res.status).toBe(204);
        expect(cache.moderation.calls.unbanUser).toEqual([{ userId: '555' }]);
    });

    it('POST /api/users/:id/roles forwards isMod/isVip target', async () => {
        const res = await fetch(`http://127.0.0.1:${port}/api/users/555/roles`, {
            method: 'POST',
            headers: { ...authHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ isMod: true, isVip: false }),
        });
        expect(res.status).toBe(204);
        expect(cache.moderation.calls.setUserRoles).toEqual([
            { userId: '555', target: { isMod: true, isVip: false } },
        ]);
    });

    it('POST /api/users/:id/roles rejects empty body with 400', async () => {
        const res = await fetch(`http://127.0.0.1:${port}/api/users/555/roles`, {
            method: 'POST',
            headers: { ...authHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });
        expect(res.status).toBe(400);
        expect(cache.moderation.calls.setUserRoles).toHaveLength(0);
    });

    it('DELETE /api/messages/:id forwards the message id', async () => {
        const res = await fetch(`http://127.0.0.1:${port}/api/messages/msg-abc-123`, {
            method: 'DELETE',
            headers: authHeaders,
        });
        expect(res.status).toBe(204);
        expect(cache.moderation.calls.deleteMessage).toEqual([{ messageId: 'msg-abc-123' }]);
    });

    it('maps dep errors to 500 without leaking details', async () => {
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        cache.moderation.getUserById = async () => { throw new Error('secret internal crash'); };
        const res = await fetch(`http://127.0.0.1:${port}/api/users/42`, { headers: authHeaders });
        errSpy.mockRestore();
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.error).toBe('internal error');
        expect(JSON.stringify(body)).not.toContain('secret internal crash');
    });
});

describe('RemoteGatewayService static PWA serving', () => {
    let tmpDir: string;
    let service: RemoteGatewayService | null = null;
    let cache: FakeCacheHandle;
    let port: number;

    beforeAll(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-static-'));
        fs.writeFileSync(path.join(tmpDir, 'index.html'), '<!doctype html><title>PWA</title><div id=root></div>');
        fs.writeFileSync(path.join(tmpDir, 'app.js'), 'console.log("hi");');
    });

    afterAll(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    beforeEach(async () => {
        cache = createFakeCache();
        service = new RemoteGatewayService(
            makeConfig({ staticDir: tmpDir }),
            cache.deps,
        );
        const { port: actual } = await service.start();
        port = actual;
    });

    afterEach(async () => {
        if (service) {
            await service.stop();
            service = null;
        }
    });

    it('serves index.html at /', async () => {
        const res = await fetch(`http://127.0.0.1:${port}/`);
        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain('<title>PWA</title>');
    });

    it('serves static assets by name', async () => {
        const res = await fetch(`http://127.0.0.1:${port}/app.js`);
        expect(res.status).toBe(200);
        const body = await res.text();
        expect(body).toContain('hi');
    });

    it('falls back to index.html for unknown routes (SPA routing)', async () => {
        const res = await fetch(`http://127.0.0.1:${port}/some/client/route`);
        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain('<title>PWA</title>');
    });

    it('does not rewrite /api/* to the SPA shell', async () => {
        // Even without auth, /api/* must return structured 401, not
        // accidentally leak the PWA index.
        const res = await fetch(`http://127.0.0.1:${port}/api/users/42`);
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error).toBe('unauthorized');
    });

    it('returns 404 JSON for unknown /api routes even when authed', async () => {
        const res = await fetch(`http://127.0.0.1:${port}/api/nothing`, {
            headers: { Authorization: 'Bearer test-token' },
        });
        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.error).toBe('not found');
    });

    it('keeps /health as JSON, not SPA shell', async () => {
        const res = await fetch(`http://127.0.0.1:${port}/health`);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);
    });

    it('socket.io still works when static serving is enabled', async () => {
        const client = await connectSocket(`http://127.0.0.1:${port}`, 'test-token');
        const data = await client.nextEvent('chat:snapshot');
        expect(data.messages).toBeDefined();
        client.disconnect();
    });
});

describe('RemoteGatewayService without staticDir returns 404 for unknown paths', () => {
    let service: RemoteGatewayService | null = null;
    let port: number;

    beforeEach(async () => {
        const cache = createFakeCache();
        service = new RemoteGatewayService(makeConfig(), cache.deps);
        const { port: actual } = await service.start();
        port = actual;
    });

    afterEach(async () => {
        if (service) {
            await service.stop();
            service = null;
        }
    });

    it('returns 404 for GET / when staticDir is not configured', async () => {
        const res = await fetch(`http://127.0.0.1:${port}/`);
        expect(res.status).toBe(404);
    });
});

describe('RemoteGatewayService.getStatus', () => {
    it('reports not-running state before start()', () => {
        const cache = createFakeCache();
        const service = new RemoteGatewayService(makeConfig(), cache.deps);
        const status = service.getStatus();
        expect(status.running).toBe(false);
        expect(status.authTokenSet).toBe(true);
        expect(status.staticDirPresent).toBe(false);
        expect(status.lanUrls).toEqual([]);
    });

    it('reports running=true after start() and running=false after stop()', async () => {
        const cache = createFakeCache();
        const service = new RemoteGatewayService(makeConfig({ staticDir: '/tmp/definitely-does-not-exist-12345' }), cache.deps);
        await service.start();
        try {
            const running = service.getStatus();
            expect(running.running).toBe(true);
            expect(running.staticDirPresent).toBe(true);
        } finally {
            await service.stop();
        }
        const stopped = service.getStatus();
        expect(stopped.running).toBe(false);
        expect(stopped.lanUrls).toEqual([]);
    });

    it('reports authTokenSet=false when authToken is null', () => {
        const cache = createFakeCache();
        const service = new RemoteGatewayService(makeConfig({ authToken: null }), cache.deps);
        expect(service.getStatus().authTokenSet).toBe(false);
    });
});

describe('listLanUrls', () => {
    it('returns tokenless URLs when no token is passed', () => {
        const urls = listLanUrls(42010);
        for (const url of urls) {
            expect(url).toMatch(/^http:\/\/\d+\.\d+\.\d+\.\d+:42010\/$/);
        }
    });

    it('embeds ?token=... when token is passed', () => {
        const urls = listLanUrls(42010, 'my-secret');
        for (const url of urls) {
            expect(url).toMatch(/^http:\/\/\d+\.\d+\.\d+\.\d+:42010\/\?token=my-secret$/);
        }
    });

    it('url-encodes tokens with special characters', () => {
        const urls = listLanUrls(42010, 'a b+c/d=e');
        for (const url of urls) {
            // encodeURIComponent: space→%20, +→%2B, /→%2F, =→%3D
            expect(url).toContain('token=a%20b%2Bc%2Fd%3De');
        }
    });

    it('never includes loopback addresses', () => {
        const urls = listLanUrls(80);
        expect(urls.some((u) => u.includes('127.0.0.1'))).toBe(false);
    });
});

describe('RemoteGatewayService — fail-closed without token', () => {
    it('rejects everything when authToken is null', async () => {
        const cache = createFakeCache();
        const service = new RemoteGatewayService(makeConfig({ authToken: null }), cache.deps);
        const { port } = await service.start();
        try {
            await expectSocketReject(`http://127.0.0.1:${port}`, 'anything');
        } finally {
            await service.stop();
        }
    });
});
