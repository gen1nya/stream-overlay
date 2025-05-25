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

function registerEventHandlers(handler) {
    eventHandler = handler;
}

async function start() {
    const tokens = await authService.getTokens();
    if (!tokens) {
        console.error('❌ No tokens found. Cannot start EventSub.');
        return;
    }

    const accessToken = tokens.access_token;

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
            await subscribeToEvents(sessionId, accessToken);
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

async function subscribeToEvents(sessionId, accessToken) {
    const tokens = await authService.getTokens();
    const broadcasterId = tokens ? tokens.user_id : null;

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
}

module.exports = { start, stop, registerEventHandlers };

/*
[start-electron] message received:  {
    [start-electron]   metadata: {
        [start-electron]     message_id: 'Jq2pRDA2h3dyNfVuHlxDxQf26ebyirQ2FYKXu2gdAgA=',
            [start-electron]     message_type: 'notification',
            [start-electron]     message_timestamp: '2025-05-18T21:58:39.060118274Z',
            [start-electron]     subscription_type: 'channel.channel_points_custom_reward_redemption.add',
            [start-electron]     subscription_version: '1'
            [start-electron]   },
    [start-electron]   payload: {
        [start-electron]     subscription: {
            [start-electron]       id: '4fa0e2cb-82e5-4c32-95ad-45a83eba228c',
            [start-electron]       status: 'enabled',
            [start-electron]       type: 'channel.channel_points_custom_reward_redemption.add',
            [start-electron]       version: '1',
            [start-electron]       condition: [Object],
            [start-electron]       transport: [Object],
            [start-electron]       created_at: '2025-05-18T21:58:26.929784363Z',
            [start-electron]       cost: 0
            [start-electron]     },
        [start-electron]     event: {
            [start-electron]       broadcaster_user_id: '1015100674',
            [start-electron]       broadcaster_user_login: 'ellis_leaf',
            [start-electron]       broadcaster_user_name: 'Ellis_Leaf',
            [start-electron]       id: '285bc4ea-d598-42ef-971b-b03eb78ff2be',
            [start-electron]       user_id: '523886485',
            [start-electron]       user_login: 'evgeniy13555',
            [start-electron]       user_name: 'evgeniy13555',
            [start-electron]       user_input: '',
            [start-electron]       status: 'unfulfilled',
            [start-electron]       redeemed_at: '2025-05-18T21:58:38.989974068Z',
            [start-electron]       reward: [Object]
            [start-electron]     }
        [start-electron]   }
    [start-electron] }
*/