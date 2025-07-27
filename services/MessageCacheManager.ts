import { randomUUID } from 'crypto';
import {AppEvent, ParsedIrcMessage, SystemEvent} from "./messageParser";

const messageCache: Map<string, AppEvent> = new Map();
const timers: Map<string, NodeJS.Timeout> = new Map();
let messageHandler: ((data: { messages: AppEvent[]; showSourceChannel: boolean }) => void) | null = null;
let TTL = 60 * 1000; // milliseconds
let MAX_CACHE_SIZE = 6;
let showSourceChannel = false;

export function registerMessageHandler(
  handler: (data: { messages: AppEvent[]; showSourceChannel: boolean }) => void
): void {
  messageHandler = handler;
}

export function addMessage(message: AppEvent): void {
  if (!message || typeof message !== 'object') {
    console.error('❌ Invalid message format:', message);
    return;
  }
  if (message.type === 'system' || message.type === 'join' || message.type === 'part') {
    return;
  }
  if (TTL === 0) {
    return;
  }
  const id: string = message.id ?? randomUUID();
  if (timers.has(id)) {
    clearTimeout(timers.get(id)!);
  }
  messageCache.set(id, message);
  if ((message as ParsedIrcMessage).sourceRoomId && !showSourceChannel) {
    showSourceChannel = true;
    console.log('🔗 Detected collab-mode via foreign message');
  }
  if (TTL > 0) {
    const timer = setTimeout(() => {
      messageCache.delete(id);
      timers.delete(id);
      sendCached();
    }, TTL);
    timers.set(id, timer);
  }
  cleanupMessages();
  sendCached();
}

function sendCached(): void {
  if (messageHandler && TTL !== 0) {
    messageHandler({ messages: Array.from(messageCache.values()), showSourceChannel });
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
