import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AppEvent } from './twitch/messageParser';
import {
  processMessage,
  registerWindowMessageHandler,
  unregisterWindowMessageHandler,
  getCurrentWindowCache,
  updateSettings,
} from './MessageCacheManager';

// Fresh module state between tests: MessageCacheManager holds module-level
// caches, so we re-import via vi.resetModules + dynamic import.
async function freshModule() {
  vi.resetModules();
  return await import('./MessageCacheManager');
}

function makeChat(id: string, extras: Partial<AppEvent> = {}): AppEvent {
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
    ...extras,
  } as unknown as AppEvent;
}

function makeDelete(id: string): AppEvent {
  return {
    type: 'delete_msg',
    deletedMessageId: id,
  } as unknown as AppEvent;
}

describe('MessageCacheManager window listeners', () => {
  beforeEach(() => {
    // Reset TTL to default so overlay cache doesn't interfere
    updateSettings({ lifetime: 60, maxCount: 6 });
  });

  it('delivers messages to a single registered listener', async () => {
    const mod = await freshModule();
    const listener = vi.fn();
    mod.registerWindowMessageHandler(listener);

    mod.processMessage(makeChat('m1'));

    expect(listener).toHaveBeenCalled();
    const lastCall = listener.mock.calls.at(-1)![0];
    expect(lastCall.messages).toHaveLength(1);
    expect(lastCall.messages[0].id).toBe('m1');
  });

  it('fans out to multiple listeners', async () => {
    const mod = await freshModule();
    const a = vi.fn();
    const b = vi.fn();
    mod.registerWindowMessageHandler(a);
    mod.registerWindowMessageHandler(b);

    mod.processMessage(makeChat('m1'));

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(a.mock.calls[0][0].messages[0].id).toBe('m1');
    expect(b.mock.calls[0][0].messages[0].id).toBe('m1');
  });

  it('stops delivering after unregister', async () => {
    const mod = await freshModule();
    const a = vi.fn();
    const b = vi.fn();
    mod.registerWindowMessageHandler(a);
    mod.registerWindowMessageHandler(b);

    mod.processMessage(makeChat('m1'));
    mod.unregisterWindowMessageHandler(a);
    mod.processMessage(makeChat('m2'));

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(2);
  });

  it('isolates listener errors — one thrower does not block others', async () => {
    const mod = await freshModule();
    const bad = vi.fn(() => { throw new Error('boom'); });
    const good = vi.fn();
    mod.registerWindowMessageHandler(bad);
    mod.registerWindowMessageHandler(good);

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mod.processMessage(makeChat('m1'));
    errSpy.mockRestore();

    expect(bad).toHaveBeenCalled();
    expect(good).toHaveBeenCalled();
  });

  it('propagates delete_msg: removes from cache and notifies listeners', async () => {
    const mod = await freshModule();
    const listener = vi.fn();
    mod.registerWindowMessageHandler(listener);

    mod.processMessage(makeChat('m1'));
    mod.processMessage(makeChat('m2'));
    expect(mod.getCurrentWindowCache().messages.map((m: AppEvent) => m.id)).toEqual(['m1', 'm2']);

    mod.processMessage(makeDelete('m1'));

    const remaining = mod.getCurrentWindowCache().messages.map((m: AppEvent) => m.id);
    expect(remaining).toEqual(['m2']);
    const lastCall = listener.mock.calls.at(-1)![0];
    expect(lastCall.messages.map((m: AppEvent) => m.id)).toEqual(['m2']);
  });

  it('respects 40-message window cap (FIFO eviction)', async () => {
    const mod = await freshModule();
    const listener = vi.fn();
    mod.registerWindowMessageHandler(listener);

    for (let i = 0; i < 45; i++) {
      mod.processMessage(makeChat(`m${i}`));
    }

    const cache = mod.getCurrentWindowCache().messages;
    expect(cache).toHaveLength(40);
    expect(cache[0].id).toBe('m5');
    expect(cache[39].id).toBe('m44');
  });

  it('getCurrentWindowCache returns snapshot without side effects', async () => {
    const mod = await freshModule();
    mod.processMessage(makeChat('m1'));
    const snap1 = mod.getCurrentWindowCache();
    mod.processMessage(makeChat('m2'));
    const snap2 = mod.getCurrentWindowCache();
    expect(snap1.messages).toHaveLength(1);
    expect(snap2.messages).toHaveLength(2);
  });
});
