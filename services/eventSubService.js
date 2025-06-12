const WebSocket = require('ws');
const axios = require('axios');
const authService = require('./authService');
const {
    EVENT_FOLLOW,
    EVENT_REDEMPTION,
    EVENT_CHANEL
} = require('./../channels.js');

const CLIENT_ID = '1khb6hwbhh9qftsry0gnkm2eeayipc';

let ws = null;
let eventHandler = null;
let isStopping = false;

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

async function start() {
    isStopping = false;
    const tokens = await authService.getTokens();
    if (!tokens) {
        console.error('❌ No tokens found. Cannot start EventSub.');
        return;
    }

    ws = new WebSocket('wss://eventsub.wss.twitch.tv/ws');

    ws.on('open', () => {
        console.log('🟢 Connected to Twitch EventSub WebSocket');
    });

    ws.on('message', async (data) => {
        const msg = JSON.parse(data);
        const { metadata, payload } = msg;

        if (metadata.message_type === 'notification') {
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

        if (metadata.message_type === 'session_welcome') {
            const sessionId = payload.session.id;
            console.log('📡 Session started, ID:', sessionId);
            await subscribeToEvents(sessionId);
        }

        if (metadata.message_type === 'notification') {
            const event = payload.event;
            console.log('🎉 Event received:', event);
        }

        if (metadata.message_type === 'session_keepalive') {
            console.log('💓 Keep-alive received');
        }

        if (metadata.message_type === 'revocation') {
            console.warn('⚠️ Subscription revoked:', payload);
        }
    });

    ws.on('close', () => console.log('🔴 Connection closed'));
    ws.on('error', (err) => console.error('❌ WebSocket Error:', err));
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

function stop() {
    if (ws) {
        ws.close();
        ws = null;
        console.log('🛑 EventSub WebSocket closed.');
    }
    isStopping = true;
}

module.exports = { start, stop, registerEventHandlers };
