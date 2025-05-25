// authService.js rewritten to use Twitch Device Code Flow (no CLIENT_SECRET, no PKCE)
const keytar = require('keytar');
const axios = require('axios');
const { shell, dialog } = require('electron');
const { URLSearchParams } = require('url');

const CLIENT_ID = '1khb6hwbhh9qftsry0gnkm2eeayipc';
const SCOPES = [
    'channel:read:redemptions',
    'channel:read:subscriptions',
    'channel:read:polls',
    'channel:read:predictions',
    'channel:read:hype_train',
    'channel:read:goals',
    'channel:read:cheers',
    'user:read:follows',
    'moderator:read:followers',
    'chat:read',
    'chat:edit',
].join(' ');

const SERVICE = 'TwitchWatcherasd';
const ACCOUNT = 'tokens';
const DEVICE_INFO_SERVICE = 'TwitchWatcherDevice';
const DEVICE_INFO_ACCOUNT = 'device_code';

// Retrieve stored tokens and auto-refresh if expired
async function getTokens() {
    const raw = await keytar.getPassword(SERVICE, ACCOUNT);
    if (!raw) return null;
    let tokens = JSON.parse(raw);
    const now = Date.now();
    // Check expiry (expires_in is in seconds)
    if (tokens.obtained_at && tokens.expires_in && now >= tokens.obtained_at + tokens.expires_in * 1000) {
        try {
            tokens = await refreshToken(tokens.refresh_token);
        } catch (err) {
            console.error('❌ Token refresh failed, clearing tokens:', err.message);
            await clearTokens();
            return null;
        }
    }
    return tokens;
}

// Save tokens along with timestamp
async function saveTokens(tokens) {
    tokens.obtained_at = Date.now();
    return keytar.setPassword(SERVICE, ACCOUNT, JSON.stringify(tokens));
}

// Remove all stored credentials
async function clearTokens() {
    await keytar.deletePassword(SERVICE, ACCOUNT);
    await keytar.deletePassword(DEVICE_INFO_SERVICE, DEVICE_INFO_ACCOUNT);
}

// Refresh access token using the refresh token and update user info
async function refreshToken(refresh_token) {
    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token,
    });
    const resp = await axios.post('https://id.twitch.tv/oauth2/token', params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const newTokens = resp.data;
    // Fetch user info after refresh to update user_id and login
    try {
        const userResp = await axios.get('https://api.twitch.tv/helix/users', {
            headers: {
                'Client-ID': CLIENT_ID,
                'Authorization': `Bearer ${newTokens.access_token}`
            }
        });
        const userInfo = userResp.data.data[0];
        newTokens.user_id = userInfo.id;
        newTokens.login = userInfo.login;
    } catch (err) {
        console.warn('⚠️ Failed to fetch user info after token refresh:', err.response?.data || err.message);
    }
    await saveTokens(newTokens);
    return newTokens;
}

// Fetch user info, retry once on 401 after refreshing token
async function fetchUserInfo(accessToken) {
    try {
        const response = await axios.get('https://api.twitch.tv/helix/users', {
            headers: {
                'Client-ID': CLIENT_ID,
                'Authorization': `Bearer ${accessToken}`
            }
        });
        return response.data.data[0];
    } catch (err) {
        const status = err.response?.status;
        if (status === 401) {
            // Token invalid, attempt refresh
            console.log('🔄 Access token expired, attempting refresh...');
            const tokens = await getTokens();
            if (tokens) {
                return fetchUserInfo(tokens.access_token);
            }
        }
        console.error('❌ Failed to fetch user info:', err.response?.data || err.message);
        return null;
    }
}

async function requestDeviceCode() {
    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        scopes: SCOPES
    });
    const resp = await axios.post('https://id.twitch.tv/oauth2/device', params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const { device_code, user_code, verification_uri, expires_in, interval } = resp.data;
    await keytar.setPassword(DEVICE_INFO_SERVICE, DEVICE_INFO_ACCOUNT, device_code);
    return { user_code, verification_uri, expires_in, interval };
}

async function pollForToken() {
    const deviceCode = await keytar.getPassword(DEVICE_INFO_SERVICE, DEVICE_INFO_ACCOUNT);
    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: deviceCode
    }).toString();

    while (true) {
        try {
            const resp = await axios.post('https://id.twitch.tv/oauth2/token', params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            const tokens = resp.data;
            await saveTokens(tokens);
            await keytar.deletePassword(DEVICE_INFO_SERVICE, DEVICE_INFO_ACCOUNT);
            return tokens;
        } catch (err) {
            const error = err.response?.data;
            if (error?.message === 'authorization_pending') {
                await new Promise(r => setTimeout(r, (error.interval || 5) * 1000));
                continue;
            }
            if (error?.message === 'expired_token' || error?.message === 'access_denied') {
                throw new Error(`Device flow failed: ${error.message}`);
            }
            console.error('❌ Device token error:', error || err.message);
            throw err;
        }
    }
}

async function authorizeIfNeeded() {
    const tokens = await getTokens();
    if (tokens) {
        return true;
    }

    try {
        const { user_code, verification_uri } = await requestDeviceCode();
        const message = `To authorize, go to ${verification_uri} and enter code ${user_code}`;
        shell.openExternal(verification_uri);
        dialog.showMessageBox({ type: 'info', message, buttons: ['OK'] });

        const newTokens = await pollForToken();
        const userInfo = await fetchUserInfo(newTokens.access_token);
        if (userInfo) {
            newTokens.user_id = userInfo.id;
            newTokens.login = userInfo.login;
            await saveTokens(newTokens);
        }
        return true;
    } catch (err) {
        console.error('❌ Authorization failed:', err.message);
        return false;
    }
}

module.exports = {
    authorizeIfNeeded,
    getTokens,
    clearTokens,
    fetchUserInfo,
    CLIENT_ID
};
