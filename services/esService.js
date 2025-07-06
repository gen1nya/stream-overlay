const WebSocket = require('ws');
const axios = require('axios');
const authService = require('./authService');
const {
    EVENT_FOLLOW,
    EVENT_REDEMPTION,
    EVENT_CHANEL
} = require('./../channels.js');
const MESSAGE_TYPES = require('./eventSubMessageTypes');
const knownTypes = Object.values(MESSAGE_TYPES);

const CLIENT_ID = '1khb6hwbhh9qftsry0gnkm2eeayipc';
const DEFAULT_URL = 'wss://eventsub.wss.twitch.tv/ws';
const HEALTH_CHECK_INTERVAL = 60 * 1000;
const INACTIVITY_THRESHOLD = 6 * 60 * 1000;

// Глобальная блокировка для предотвращения множественных инстансов
let globalLock = null;

class EventSubService {
    constructor() {
        // Проверяем, есть ли уже активный инстанс
        if (globalLock) {
            throw new Error('EventSubService уже запущен! Используйте существующий инстанс.');
        }

        // Устанавливаем глобальную блокировку
        globalLock = this;

        this.ws = null;
        this.eventHandler = null;
        this.isStopping = false;
        this.isConnecting = false;
        this.connectUrl = DEFAULT_URL;
        this.skipSubscribe = false;
        this.ignoreClose = false;
        this.lastEventTimestamp = Date.now();
        this.healthCheckTimer = null;
        this.connectionId = this.generateConnectionId();

        console.log(`🔐 EventSub инстанс создан с ID: ${this.connectionId}`);

        // Обработчик для очистки при завершении процесса
        process.on('exit', () => this.cleanup());
        process.on('SIGINT', () => this.cleanup());
        process.on('SIGTERM', () => this.cleanup());

        this.initializeService();
    }

    generateConnectionId() {
        return `eventsub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    initializeService() {
        authService.onTokenRefreshed(() => {
            if (!this.isStopping) {
                console.log(`🔄 [${this.connectionId}] Tokens refreshed, restarting...`);
                this.safeRestart();
            }
        });

        this.startHealthCheck();
    }

    startHealthCheck() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
        }

        this.healthCheckTimer = setInterval(() => {
            if (globalLock !== this) {
                console.error(`❌ [${this.connectionId}] Обнаружен другой активный инстанс! Останавливаем этот.`);
                this.stop();
                return;
            }

            const inactivity = Date.now() - this.lastEventTimestamp;
            if (inactivity > INACTIVITY_THRESHOLD && !this.isConnecting && !this.isStopping) {
                console.warn(`⚠️ [${this.connectionId}] No activity detected, restarting...`);
                this.safeRestart();
            }
        }, HEALTH_CHECK_INTERVAL);
    }

    async safeRestart() {
        console.log(`🔄 [${this.connectionId}] Безопасный перезапуск...`);

        // Временно отключаем автоматические перезапуски
        const oldIgnoreClose = this.ignoreClose;
        this.ignoreClose = true;

        // Закрываем старое соединение
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        // Небольшая задержка
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Восстанавливаем настройки и запускаем
        this.ignoreClose = oldIgnoreClose;
        this.isStopping = false;
        this.isConnecting = false;

        await this.start();
    }

    registerEventHandlers(handler) {
        this.eventHandler = handler;
    }

    async start(url = DEFAULT_URL, skipSub = false) {
        // Проверяем, что мы все еще единственный активный инстанс
        if (globalLock !== this) {
            throw new Error(`Попытка запуска неактивного инстанса ${this.connectionId}`);
        }

        this.isStopping = false;
        this.connectUrl = url;
        this.skipSubscribe = skipSub;

        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            console.log(`ℹ️ [${this.connectionId}] WebSocket already connected.`);
            return;
        }

        if (this.isConnecting) {
            console.log(`⏳ [${this.connectionId}] Connection already in progress.`);
            return;
        }

        this.isConnecting = true;
        const tokens = await authService.getTokens();
        if (!tokens) {
            console.error(`❌ [${this.connectionId}] No tokens found.`);
            this.isConnecting = false;
            return;
        }

        const ws = new WebSocket(this.connectUrl);
        this.ws = ws;

        ws.on('open', () => {
            this.isConnecting = false;
            this.lastEventTimestamp = Date.now();
            console.log(`🟢 [${this.connectionId}] Connected to Twitch EventSub`);
        });

        ws.on('ping', function () {
            if (this.readyState === WebSocket.OPEN) {
                this.pong();
            }
        });

        ws.on('message', async (data) => {
            this.lastEventTimestamp = Date.now();
            const msg = JSON.parse(data);
            const { metadata, payload } = msg;

            if (metadata.message_type === MESSAGE_TYPES.NOTIFICATION) {
                const event = payload.event;

                if (payload.subscription.type === 'channel.follow') {
                    console.log(`🎉 [${this.connectionId}] Новый фолловер: ${event.user_name}`);
                    if (this.eventHandler) {
                        this.eventHandler(
                            `${EVENT_CHANEL}:${EVENT_FOLLOW}`,
                            {
                                userId: event.user_id,
                                userLogin: event.user_login,
                                userName: event.user_name,
                                followedAt: event.followed_at
                            }
                        );
                    }
                }

                if (payload.subscription.type === 'channel.channel_points_custom_reward_redemption.add') {
                    const reward = payload.event.reward;
                    console.log(`🎉 [${this.connectionId}] потрачены балы: ${reward.title}`);
                    if (this.eventHandler) {
                        this.eventHandler(
                            `${EVENT_CHANEL}:${EVENT_REDEMPTION}`,
                            {
                                userId: event.user_id,
                                userLogin: event.user_login,
                                userName: event.user_name,
                                reward: reward
                            }
                        );
                    }
                }
            }

            if (metadata.message_type === MESSAGE_TYPES.SESSION_WELCOME) {
                const sessionId = payload.session.id;
                console.log(`📡 [${this.connectionId}] Session started, ID:`, sessionId);
                if (!this.skipSubscribe) {
                    await this.subscribeToEvents(sessionId);
                }
                this.skipSubscribe = false;
            }

            if (metadata.message_type === MESSAGE_TYPES.SESSION_KEEPALIVE) {
                console.log(`💓 [${this.connectionId}] Keep-alive received`);
            }

            if (metadata.message_type === MESSAGE_TYPES.SESSION_RECONNECT) {
                const newUrl = payload.session.reconnect_url;
                console.log(`🔄 [${this.connectionId}] Reconnect requested:`, newUrl);
                this.stop({ setStopping: false, ignoreClose: true });
                this.start(newUrl, true);
            }

            if (metadata.message_type === MESSAGE_TYPES.REVOCATION) {
                console.warn(`⚠️ [${this.connectionId}] Subscription revoked:`, payload);
            }

            if (!knownTypes.includes(metadata.message_type)) {
                console.log(`❓ [${this.connectionId}] Unknown message type:`, metadata.message_type);
            }
        });

        ws.on('close', () => {
            this.isConnecting = false;
            console.log(`🔴 [${this.connectionId}] Connection closed`);
            if (!this.ignoreClose && !this.isStopping && globalLock === this) {
                setTimeout(() => this.start(), 5000);
            }
            this.ignoreClose = false;
        });

        ws.on('error', (err) => {
            this.isConnecting = false;
            console.error(`❌ [${this.connectionId}] WebSocket Error:`, err);
        });
    }

    async subscribeToEvents(sessionId) {
        const tokens = await authService.getTokens();
        const broadcasterId = tokens ? tokens.user_id : null;
        const accessToken = tokens ? tokens.access_token : null;

        if (!accessToken || !broadcasterId) {
            console.error(`❌ [${this.connectionId}] Tokens unavailable.`);
            this.stop();
            return;
        }

        const subscriptions = {
            'channel.raid': {
                version: '1',
                condition: (id) => ({ to_broadcaster_user_id: id })
            },
            'channel.bits.use': {
                version: '1',
                condition: (id) => ({ broadcaster_user_id: id })
            },
            'channel.subscribe': {
                version: '1',
                condition: (id) => ({ broadcaster_user_id: id })
            },
            'channel.channel_points_custom_reward_redemption.add': {
                version: '1',
                condition: (id) => ({ broadcaster_user_id: id })
            },
            'channel.follow': {
                version: '2',
                condition: (id) => ({
                    broadcaster_user_id: id,
                    moderator_user_id: id
                })
            }
        };

        for (const [type, sub] of Object.entries(subscriptions)) {
            if (!sub || typeof sub.condition !== 'function' || !sub.version) {
                console.warn(`⚠️ [${this.connectionId}] Invalid subscription config for ${type}`);
                continue;
            }

            const conditionData = sub.condition(broadcasterId);

            try {
                await axios.post('https://api.twitch.tv/helix/eventsub/subscriptions', {
                    type,
                    version: sub.version,
                    condition: conditionData,
                    transport: {
                        method: 'websocket',
                        session_id: sessionId
                    }
                }, {
                    headers: {
                        'Client-ID': CLIENT_ID,
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                console.log(`✅ [${this.connectionId}] Subscribed to ${type}`);
            } catch (error) {
                const status = error.response?.status;
                if (status === 401 && !this.isStopping) {
                    console.warn(`⚠️ [${this.connectionId}] Unauthorized, refreshing...`);
                    const refreshed = await authService.getTokens();
                    if (!refreshed) {
                        console.error(`❌ [${this.connectionId}] Token refresh failed.`);
                        this.stop();
                        return;
                    }
                    await this.subscribeToEvents(sessionId);
                    return;
                }
                console.error(`❌ [${this.connectionId}] Failed to subscribe to ${type}:`, error.response?.data || error.message);
            }
        }
    }

    stop(options = {}) {
        const { setStopping = true, ignoreClose = false } = options;

        console.log(`🛑 [${this.connectionId}] Stopping EventSub...`);

        if (this.ws) {
            this.ignoreClose = ignoreClose;
            this.ws.close();
            this.ws = null;
        }

        if (setStopping) {
            this.isStopping = true;
        }

        this.isConnecting = false;

        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
    }

    cleanup() {
        console.log(`🧹 [${this.connectionId}] Cleaning up...`);
        this.stop();
        if (globalLock === this) {
            globalLock = null;
        }
    }

    getLastEventTimestamp() {
        return this.lastEventTimestamp;
    }

    getConnectionId() {
        return this.connectionId;
    }

    static getInstance() {
        return globalLock;
    }

    static hasActiveInstance() {
        return globalLock !== null;
    }
}

let instance = null;

function createInstance() {
    if (instance) {
        console.warn('⚠️ Попытка создать второй инстанс EventSub. Используется существующий.');
        return instance;
    }

    try {
        instance = new EventSubService();
        return instance;
    } catch (error) {
        console.error('❌ Ошибка создания EventSub инстанса:', error.message);
        return null;
    }
}

if (!instance) {
    instance = createInstance();
}

module.exports = {
    start: (...args) => instance?.start(...args),
    stop: (...args) => instance?.stop(...args),
    registerEventHandlers: (handler) => instance?.registerEventHandlers(handler),
    getLastEventTimestamp: () => instance?.getLastEventTimestamp(),
    getConnectionId: () => instance?.getConnectionId(),
    getInstance: () => instance,
    hasActiveInstance: () => EventSubService.hasActiveInstance()
};