import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WebSocket from 'ws';
import type { AppEvent } from './twitch/messageParser';
import {
    RemoteGatewayService,
    type RemoteGatewayConfig,
    type RemoteGatewayDeps,
    type WindowCacheSnapshot,
    type WindowListener,
} from './RemoteGatewayService';

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

    const deps: RemoteGatewayDeps = {
        getWindowCache: () => ({ messages: [...cache.messages], showSourceChannel: cache.showSourceChannel }),
        subscribeWindow: (listener) => {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
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
    };
}

function makeConfig(overrides: Partial<RemoteGatewayConfig> = {}): RemoteGatewayConfig {
    return {
        port: 0, // ephemeral — OS picks a free port
        authToken: 'test-token',
        ...overrides,
    };
}

// ws 101 and the first server frame can arrive back-to-back, so a
// pattern like `await waitForOpen(ws); await waitForMessage(ws);` races
// — the .once('message') listener is installed after the message has
// already been dispatched, and we hang. Instead, attach a persistent
// 'message' listener synchronously at connect time and buffer into a
// queue; tests then await nextMessage() which either shifts from the
// queue or parks a waiter.
interface Client {
    ws: WebSocket;
    nextMessage: () => Promise<any>;
}

async function connect(url: string, options?: WebSocket.ClientOptions): Promise<Client> {
    const ws = options ? new WebSocket(url, options) : new WebSocket(url);
    const queue: any[] = [];
    const waiters: Array<(msg: any) => void> = [];

    ws.on('message', (data) => {
        let parsed: any;
        try { parsed = JSON.parse(data.toString()); } catch { parsed = data.toString(); }
        const waiter = waiters.shift();
        if (waiter) waiter(parsed);
        else queue.push(parsed);
    });

    await new Promise<void>((resolve, reject) => {
        ws.once('open', () => resolve());
        ws.once('error', (e) => reject(e));
    });

    return {
        ws,
        nextMessage: () => new Promise((resolve) => {
            if (queue.length > 0) resolve(queue.shift());
            else waiters.push(resolve);
        }),
    };
}

function waitForClose(ws: WebSocket): Promise<{ code: number }> {
    return new Promise((resolve) => {
        // ws readyState CLOSED = 3. If the close already happened before
        // we got here, attaching .once('close') is too late — check and
        // short-circuit.
        if (ws.readyState === 3) {
            resolve({ code: 0 });
            return;
        }
        ws.once('close', (code) => resolve({ code }));
    });
}

async function expectWsReject(url: string, options?: WebSocket.ClientOptions): Promise<void> {
    const ws = options ? new WebSocket(url, options) : new WebSocket(url);
    // Silence the "error" event — we expect it.
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
        await new Promise<void>((resolve, reject) => {
            ws.once('open', () => reject(new Error('expected ws to be rejected, but it opened')));
            ws.once('error', () => resolve());
            ws.once('unexpected-response', () => resolve());
        });
    } finally {
        errSpy.mockRestore();
        try { ws.terminate(); } catch { /* ignore */ }
    }
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

    it('rejects ws upgrade without a token', async () => {
        await expectWsReject(`ws://127.0.0.1:${port}/ws/chat`);
    });

    it('rejects ws upgrade with a wrong token', async () => {
        await expectWsReject(`ws://127.0.0.1:${port}/ws/chat?token=nope`);
    });

    it('accepts ws upgrade with correct token via query param and delivers initial snapshot', async () => {
        const client = await connect(`ws://127.0.0.1:${port}/ws/chat?token=test-token`);
        const msg = await client.nextMessage();
        expect(msg.type).toBe('chat:snapshot');
        expect(msg.messages).toHaveLength(2);
        expect(msg.messages.map((m: AppEvent) => m.id)).toEqual(['existing-1', 'existing-2']);
        client.ws.close();
        await waitForClose(client.ws);
    });

    it('accepts ws upgrade with Authorization: Bearer header', async () => {
        const client = await connect(`ws://127.0.0.1:${port}/ws/chat`, {
            headers: { Authorization: 'Bearer test-token' },
        });
        const msg = await client.nextMessage();
        expect(msg.type).toBe('chat:snapshot');
        client.ws.close();
        await waitForClose(client.ws);
    });

    it('pushes live chat:update frames to all connected clients', async () => {
        const a = await connect(`ws://127.0.0.1:${port}/ws/chat?token=test-token`);
        const b = await connect(`ws://127.0.0.1:${port}/ws/chat?token=test-token`);
        // Drain initial snapshots
        await a.nextMessage();
        await b.nextMessage();

        cache.push(makeChat('live-1'));

        const msgA = await a.nextMessage();
        const msgB = await b.nextMessage();
        expect(msgA.type).toBe('chat:update');
        expect(msgB.type).toBe('chat:update');
        expect(msgA.messages.map((m: AppEvent) => m.id)).toContain('live-1');
        expect(msgB.messages.map((m: AppEvent) => m.id)).toContain('live-1');

        // Install both close waiters before initiating close, otherwise
        // the second .once('close') can be attached after the event has
        // already fired and hangs forever.
        const aClosed = waitForClose(a.ws);
        const bClosed = waitForClose(b.ws);
        a.ws.close();
        b.ws.close();
        await Promise.all([aClosed, bClosed]);
    });

    it('rejects unknown ws paths with 404', async () => {
        await expectWsReject(`ws://127.0.0.1:${port}/ws/nope?token=test-token`);
    });

    it('unsubscribes from the cache on stop', async () => {
        expect(cache.listenerCount()).toBe(1);
        await service!.stop();
        service = null;
        expect(cache.listenerCount()).toBe(0);
    });

    it('removes client from fan-out set on disconnect without crashing subsequent pushes', async () => {
        const client = await connect(`ws://127.0.0.1:${port}/ws/chat?token=test-token`);
        await client.nextMessage(); // snapshot
        client.ws.close();
        await waitForClose(client.ws);

        // Pushing after disconnect must not throw or leak. We cannot
        // observe the fan-out set directly, but the second live push
        // below should be ignored by the now-closed client without
        // breaking the rest of the service loop.
        cache.push(makeChat('post-close'));
        await new Promise((r) => setTimeout(r, 20));

        // Spin up a fresh client and verify the service is still alive.
        const alive = await connect(`ws://127.0.0.1:${port}/ws/chat?token=test-token`);
        const msg = await alive.nextMessage();
        expect(msg.type).toBe('chat:snapshot');
        alive.ws.close();
        await waitForClose(alive.ws);
    });
});

describe('RemoteGatewayService — fail-closed without token', () => {
    it('rejects everything when authToken is null', async () => {
        const cache = createFakeCache();
        const service = new RemoteGatewayService(makeConfig({ authToken: null }), cache.deps);
        const { port } = await service.start();
        try {
            await expectWsReject(`ws://127.0.0.1:${port}/ws/chat?token=anything`);
        } finally {
            await service.stop();
        }
    });
});
