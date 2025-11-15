import { randomUUID } from 'crypto';
import {AppEvent, ParsedIrcMessage, SystemEvent} from "./twitch/messageParser";

// Overlay cache (with TTL and user-defined max count)
const messageCache: Map<string, AppEvent> = new Map();
const timers: Map<string, NodeJS.Timeout> = new Map();
let messageHandler: ((data: { messages: AppEvent[]; showSourceChannel: boolean }) => void) | null = null;
let TTL = 60 * 1000; // milliseconds
let MAX_CACHE_SIZE = 6;
let showSourceChannel = false;

// Window mode cache (no TTL, fixed 40 messages)
const windowCache: Map<string, AppEvent> = new Map();
let windowMessageHandler: ((data: { messages: AppEvent[]; showSourceChannel: boolean }) => void) | null = null;
const WINDOW_MAX_CACHE_SIZE = 40;
let windowShowSourceChannel = false;

export function registerMessageHandler(
  handler: (data: { messages: AppEvent[]; showSourceChannel: boolean }) => void
): void {
  messageHandler = handler;
}

export function registerWindowMessageHandler(
  handler: (data: { messages: AppEvent[]; showSourceChannel: boolean }) => void
): void {
  windowMessageHandler = handler;
}

export function processMessage(message: AppEvent): void {
  if (!message || typeof message !== 'object') {
    console.error('❌ Invalid message format:', message);
    return;
  }
  const {
    type,
    id,
    deletedMessageId,
    sourceRoomId
  } = message as ParsedIrcMessage;

  if (['system', 'join', 'part'].includes(type)) return;

  if (type === 'delete_msg' && deletedMessageId) {
    // Delete from both caches
    if (messageCache.has(deletedMessageId)) {
      messageCache.delete(deletedMessageId);
      console.log(`🗑️ Message ${deletedMessageId} deleted from overlay cache`);
      sendCached();
    }
    if (windowCache.has(deletedMessageId)) {
      windowCache.delete(deletedMessageId);
      console.log(`🗑️ Message ${deletedMessageId} deleted from window cache`);
      sendWindowCached();
    }
    return;
  }
  if (TTL === 0) return;
  const messageId = id ?? randomUUID();
  if (timers.has(messageId)) {
    clearTimeout(timers.get(messageId)!);
  }
  messageCache.set(messageId, message);

  if (sourceRoomId && !showSourceChannel) {
    showSourceChannel = true;
    console.log('🔗 Detected collab-mode via foreign message');
  }

  if (TTL > 0) {
    const timer = setTimeout(() => {
      messageCache.delete(messageId);
      timers.delete(messageId);
      sendCached();
    }, TTL);
    timers.set(messageId, timer);
  }

  cleanupMessages();
  sendCached();

  // Also add to window cache
  processWindowMessage(message);
}

function processWindowMessage(message: AppEvent): void {
  const { id, sourceRoomId } = message as ParsedIrcMessage;
  const messageId = id ?? randomUUID();

  windowCache.set(messageId, message);

  if (sourceRoomId && !windowShowSourceChannel) {
    windowShowSourceChannel = true;
  }

  cleanupWindowMessages();
  sendWindowCached();
}


function sendCached(): void {
  if (messageHandler && TTL !== 0) {
    messageHandler({ messages: Array.from(messageCache.values()), showSourceChannel });
  }
}

function sendWindowCached(): void {
  if (windowMessageHandler) {
    windowMessageHandler({ messages: Array.from(windowCache.values()), showSourceChannel: windowShowSourceChannel });
  }
}

function cleanupMessages(): void {
  const now = Date.now();
  if (TTL > 0) {
    for (const [id, message] of messageCache.entries()) {
      if ((message.timestamp ?? 0) + TTL < now) {
        messageCache.delete(id);
        if (timers.has(id)) {
          clearTimeout(timers.get(id)!);
          timers.delete(id);
        }
      }
    }
  }
  while (messageCache.size > MAX_CACHE_SIZE) {
    const oldestKey = messageCache.keys().next().value as string;
    messageCache.delete(oldestKey);
    if (timers.has(oldestKey)) {
      clearTimeout(timers.get(oldestKey)!);
      timers.delete(oldestKey);
    }
  }
}

function cleanupWindowMessages(): void {
  // Window cache has no TTL, only size limit
  while (windowCache.size > WINDOW_MAX_CACHE_SIZE) {
    const oldestKey = windowCache.keys().next().value as string;
    windowCache.delete(oldestKey);
  }
}

export function getCurrentCache(): { messages: AppEvent[]; showSourceChannel: boolean } {
  return {
    messages: Array.from(messageCache.values()),
    showSourceChannel
  };
}

export function getCurrentWindowCache(): { messages: AppEvent[]; showSourceChannel: boolean } {
  return {
    messages: Array.from(windowCache.values()),
    showSourceChannel: windowShowSourceChannel
  };
}

export function updateSettings({ lifetime, maxCount }: { lifetime?: number; maxCount?: number }): void {
  if (typeof lifetime === 'number') {
    TTL = lifetime * 1000;
  }
  if (typeof maxCount === 'number') {
    MAX_CACHE_SIZE = maxCount;
  }
  for (const timer of timers.values()) {
    clearTimeout(timer);
  }
  timers.clear();
  if (TTL === 0) {
    showSourceChannel = false;
    messageCache.clear();
    if (messageHandler) {
      messageHandler({ messages: [], showSourceChannel: false });
    }
    return;
  }
  const now = Date.now();
  if (TTL > 0) {
    for (const [id, msg] of messageCache.entries()) {
      const remaining = TTL - (now - (msg.timestamp ?? 0));
      if (remaining <= 0) {
        messageCache.delete(id);
        continue;
      }
      const t = setTimeout(() => {
        messageCache.delete(id);
        timers.delete(id);
        sendCached();
      }, remaining);
      timers.set(id, t);
    }
  }
  cleanupMessages();
  sendCached();
}
