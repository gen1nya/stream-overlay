const { URLSearchParams } = require('url');
const axios = require('axios');
const authService = require('./authService');

async function timeoutUser(
    user_id,
    duration = 600,
    reason = ''
) {
    const tokens = await authService.getTokens();
    if (!tokens?.access_token) throw new Error('No access token');
    const broadcaster_id = await authService.getUserId();
    const moderator_id = broadcaster_id;
    const params = new URLSearchParams({broadcaster_id, moderator_id});
    const url = `https://api.twitch.tv/helix/moderation/bans?${params}`;
    const body = {data: {user_id, duration, reason}};
    await axios.post(url, body, {
        headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Client-Id': authService.CLIENT_ID,
            'Content-Type': 'application/json'
        }
    });
}

module.exports = {
    timeoutUser
}