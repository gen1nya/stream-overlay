const messageCache = new Map();
const timers = new Map();
const { randomUUID } = require('crypto');

let messageHandler = null;
const TTL = 60 * 1000;
const MAX_CACHE_SIZE = 6;

export function registerMessageHandler(handler) {
    messageHandler = handler;
}

export function addMessage(message) {
    if (!message || typeof message !== 'object') {
        console.error('❌ Invalid message format:', message);
        return;
    }

    const id = message.id || randomUUID();

    if (timers.has(id)) {
        clearTimeout(timers.get(id));
    }

    messageCache.set(id, { ...message, id, timestamp: Date.now() });

    const timer = setTimeout(() => {
        messageCache.delete(id);
        timers.delete(id);
        sendCached();
    }, TTL);

    timers.set(id, timer);

    cleanupMessages();
    sendCached();
}

function sendCached() {
    if (messageHandler) {
        messageHandler(Array.from(messageCache.values()));
    }
}

function cleanupMessages() {
    const now = Date.now();

    for (const [id, message] of messageCache.entries()) {
        if (message.timestamp + TTL < now) {
            messageCache.delete(id);
            if (timers.has(id)) {
                clearTimeout(timers.get(id));
                timers.delete(id);
            }
        }
    }

    while (messageCache.size > MAX_CACHE_SIZE) {
        const oldestKey = messageCache.keys().next().value;
        messageCache.delete(oldestKey);
        if (timers.has(oldestKey)) {
            clearTimeout(timers.get(oldestKey));
            timers.delete(oldestKey);
        }
    }
}