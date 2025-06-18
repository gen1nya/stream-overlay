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
const HEALTH_CHECK_INTERVAL = 60 * 1000; // 1 minute
const INACTIVITY_THRESHOLD = 6 * 60 * 1000; // restart if no events for 6 min

class EventSubService {
    constructor() {
        this.ws = null;
        this.eventHandler = null;
        this.isStopping = false;
        this.isConnecting = false;
        this.connectUrl = DEFAULT_URL;
        this.skipSubscribe = false;
        this.ignoreClose = false;
        this.lastEventTimestamp = Date.now();

        authService.onTokenRefreshed(() => {
            if (!this.isStopping) {
                console.log('🔄 Tokens refreshed, restarting EventSub connection...');
                // ignoreClose ensures the automatic reconnect on "close" doesn't
                // spawn an extra connection while we manually restart
                this.stop({ setStopping: false, ignoreClose: true });
                this.start();
            }
        });

        setInterval(() => {
            const inactivity = Date.now() - this.lastEventTimestamp;
            if (inactivity > INACTIVITY_THRESHOLD && !this.isConnecting && !this.isStopping) {
                console.warn('⚠️ No EventSub activity detected, restarting connection...');
                this.stop();
                this.start();
            }
        }, HEALTH_CHECK_INTERVAL);
    }

    registerEventHandlers(handler) {
        this.eventHandler = handler;
    }

    async start(url = DEFAULT_URL, skipSub = false) {
        this.isStopping = false;
        this.connectUrl = url;
        this.skipSubscribe = skipSub;

        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            console.log('ℹ️ EventSub WebSocket already connected.');
            return;
        }

        if (this.isConnecting) {
            console.log('⏳ EventSub connection already in progress.');
            return;
        }

        this.isConnecting = true;
        const tokens = await authService.getTokens();
        if (!tokens) {
            console.error('❌ No tokens found. Cannot start EventSub.');
            this.isConnecting = false;
            return;
        }

        const ws = new WebSocket(this.connectUrl);
        this.ws = ws;

        ws.on('open', () => {
            this.isConnecting = false;
            this.lastEventTimestamp = Date.now();
            console.log('🟢 Connected to Twitch EventSub WebSocket');
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
                console.log(`🎉 Новый фолловер: ${event.user_name}`);
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
                // Можно отправить это событие в UI через IPC
            }

            if (payload.subscription.type === 'channel.channel_points_custom_reward_redemption.add') {
                const reward = payload.event.reward;
                console.log(`🎉 потрачены балы канала: ${reward.title} ${reward.prompt} стоило ${reward.cost} `);
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
            console.log('📡 Session started, ID:', sessionId);
            if (!this.skipSubscribe) {
                await this.subscribeToEvents(sessionId);
            }
            this.skipSubscribe = false;
        }

        if (metadata.message_type === MESSAGE_TYPES.NOTIFICATION) {
            const event = payload.event;
            console.log('🎉 Event received:', event);
        }

        if (metadata.message_type === MESSAGE_TYPES.SESSION_KEEPALIVE) {
            console.log(`💓 Keep-alive received ${Date.now()}`);
        }

        if (metadata.message_type === MESSAGE_TYPES.SESSION_RECONNECT) {
            const newUrl = payload.session.reconnect_url;
            console.log('🔄 Reconnect requested. Connecting to new URL:', newUrl);
            this.stop({ setStopping: false, ignoreClose: true });
            this.start(newUrl, true);
        }


        if (metadata.message_type === MESSAGE_TYPES.REVOCATION) {
            console.warn('⚠️ Subscription revoked:', payload);
        }

        if (!knownTypes.includes(metadata.message_type)) {
            console.log('❓ Unknown message type:', metadata.message_type, payload);
        }
    });

    ws.on('close', () => {
        this.isConnecting = false;
        console.log('🔴 Connection closed');
        if (!this.ignoreClose && !this.isStopping) {
            setTimeout(() => this.start(), 5000);
        }
        this.ignoreClose = false;
    });
    ws.on('error', (err) => {
        this.isConnecting = false;
        console.error('❌ WebSocket Error:', err);
    });
    }

    async subscribeToEvents(sessionId) {
        const tokens = await authService.getTokens();
        const broadcasterId = tokens ? tokens.user_id : null;
        const accessToken = tokens ? tokens.access_token : null;

        if (!accessToken || !broadcasterId) {
            console.error('❌ Tokens unavailable. Stopping EventSub.');
            this.stop();
            return;
        }

        if (!broadcasterId) {
            console.log(tokens);
            console.error('❌ Broadcaster ID not found.');
            return;
        }

    const subscriptions = {
        'channel.raid': {
            version: '1',
            condition: (id) => ({ to_broadcaster_user_id: id })
        },
        'channel.cheer': {
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
                console.warn(`⚠️ Invalid or incomplete subscription config for ${type}. Skipping...`);
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

                console.log(`✅ Subscribed to ${type}`);
            } catch (error) {
                const status = error.response?.status;
                if (status === 401 && !this.isStopping) {
                    console.warn('⚠️ EventSub unauthorized, attempting token refresh...');
                    const refreshed = await authService.getTokens();
                    if (!refreshed) {
                        console.error('❌ Token refresh failed. Stopping EventSub.');
                        this.stop();
                        return;
                    }
                    await this.subscribeToEvents(sessionId); // retry with new token
                    return;
                }
                console.error(`❌ Failed to subscribe to ${type}:`, error.response?.data || error.message);
            }
        }
    }

    stop(options = {}) {
        const { setStopping = true, ignoreClose = false } = options;
        if (this.ws) {
            this.ignoreClose = ignoreClose;
            this.ws.close();
            this.ws = null;
            console.log('🛑 EventSub WebSocket closed.');
        }
        if (setStopping) {
            this.isStopping = true;
        }
        this.isConnecting = false;
    }

    getLastEventTimestamp() {
        return this.lastEventTimestamp;
    }
}

const instance = new EventSubService();

module.exports = {
    start: (...args) => instance.start(...args),
    stop: (...args) => instance.stop(...args),
    registerEventHandlers: (handler) => instance.registerEventHandlers(handler),
    getLastEventTimestamp: () => instance.getLastEventTimestamp(),
};
