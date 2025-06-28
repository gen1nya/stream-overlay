const messageCache = new Map();
const timers = new Map();
const { randomUUID } = require('crypto');

let messageHandler = null;
let TTL = 60 * 1000; // milliseconds
let MAX_CACHE_SIZE = 6;
let showSourceChannel = false;

function registerMessageHandler(handler) {
    messageHandler = handler;
}

function addMessage(message) {
    if (!message || typeof message !== 'object') {
        console.error('❌ Invalid message format:', message);
        return;
    }

    if (TTL === 0) {
        // Chat disabled, ignore new messages
        return;
    }

    const id = message.id || randomUUID();

    if (timers.has(id)) {
        clearTimeout(timers.get(id));
    }

    messageCache.set(id, { ...message, id, timestamp: Date.now() });

    if (message.sourceRoomId && !showSourceChannel) {
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

function sendCached() {
    if (messageHandler && TTL !== 0) {
        messageHandler({
            messages: Array.from(messageCache.values()),
            showSourceChannel
        });
    }
}

function cleanupMessages() {
    const now = Date.now();

    if (TTL > 0) {
        for (const [id, message] of messageCache.entries()) {
            if (message.timestamp + TTL < now) {
                messageCache.delete(id);
                if (timers.has(id)) {
                    clearTimeout(timers.get(id));
                    timers.delete(id);
                }
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

function updateSettings({ lifetime, maxCount }) {
    if (typeof lifetime === 'number') {
        TTL = lifetime * 1000;
    }
    if (typeof maxCount === 'number') {
        MAX_CACHE_SIZE = maxCount;
    }

    // Clear existing timers
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
            const remaining = TTL - (now - msg.timestamp);
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

module.exports = {
    addMessage,
    registerMessageHandler,
    updateSettings,
};
