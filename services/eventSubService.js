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

let ws = null;
let eventHandler = null;
let isStopping = false;
let isConnecting = false;
let connectUrl = DEFAULT_URL;
let skipSubscribe = false;
let ignoreClose = false;
let lastEventTimestamp = Date.now();

// restart EventSub websocket when tokens are refreshed
authService.onTokenRefreshed(() => {
    if (!isStopping) {
        console.log('🔄 Tokens refreshed, restarting EventSub connection...');
        stop();
        start();
    }
});

function registerEventHandlers(handler) {
    eventHandler = handler;
}

async function start(url = DEFAULT_URL, skipSub = false) {
    isStopping = false;
    connectUrl = url;
    skipSubscribe = skipSub;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        console.log('ℹ️ EventSub WebSocket already connected.');
        return;
    }
    if (isConnecting) {
        console.log('⏳ EventSub connection already in progress.');
        return;
    }
    isConnecting = true;
    const tokens = await authService.getTokens();
    if (!tokens) {
        console.error('❌ No tokens found. Cannot start EventSub.');
        isConnecting = false;
        return;
    }

    ws = new WebSocket(connectUrl);

    ws.on('open', () => {
        isConnecting = false;
        lastEventTimestamp = Date.now();
        console.log('🟢 Connected to Twitch EventSub WebSocket');
    });

    ws.on('ping', () => ws.pong());

    ws.on('message', async (data) => {
        lastEventTimestamp = Date.now();
        const msg = JSON.parse(data);
        const { metadata, payload } = msg;

        if (metadata.message_type === MESSAGE_TYPES.NOTIFICATION) {
            const event = payload.event;

            if (payload.subscription.type === 'channel.follow') {
                console.log(`🎉 Новый фолловер: ${event.user_name}`);
                if (eventHandler) {
                    eventHandler(
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
                if (eventHandler) {
                    eventHandler(
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
            if (!skipSubscribe) {
                await subscribeToEvents(sessionId);
            }
            skipSubscribe = false;
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
            stop(false, true);
            start(newUrl, true);
        }


        if (metadata.message_type === MESSAGE_TYPES.REVOCATION) {
            console.warn('⚠️ Subscription revoked:', payload);
        }

        if (!knownTypes.includes(metadata.message_type)) {
            console.log('❓ Unknown message type:', metadata.message_type, payload);
        }
    });

    ws.on('close', () => {
        isConnecting = false;
        console.log('🔴 Connection closed');
        if (!ignoreClose && !isStopping) {
            setTimeout(() => start(), 5000);
        }
        ignoreClose = false;
    });
    ws.on('error', (err) => {
        isConnecting = false;
        console.error('❌ WebSocket Error:', err);
    });
}

async function subscribeToEvents(sessionId) {
    const tokens = await authService.getTokens();
    const broadcasterId = tokens ? tokens.user_id : null;
    const accessToken = tokens ? tokens.access_token : null;

    if (!accessToken || !broadcasterId) {
        console.error('❌ Tokens unavailable. Stopping EventSub.');
        stop();
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
            if (status === 401 && !isStopping) {
                console.warn('⚠️ EventSub unauthorized, attempting token refresh...');
                const refreshed = await authService.getTokens();
                if (!refreshed) {
                    console.error('❌ Token refresh failed. Stopping EventSub.');
                    stop();
                    return;
                }
                await subscribeToEvents(sessionId); // retry with new token
                return;
            }
            console.error(`❌ Failed to subscribe to ${type}:`, error.response?.data || error.message);
        }
    }

}

function stop(setStopping = true, ignore = false) {
    if (ws) {
        ignoreClose = ignore;
        ws.close();
        ws = null;
        console.log('🛑 EventSub WebSocket closed.');
    }
    if (setStopping) {
        isStopping = true;
    }
    isConnecting = false;
}

module.exports = {
    start,
    stop,
    registerEventHandlers,
    getLastEventTimestamp: () => lastEventTimestamp,
};
