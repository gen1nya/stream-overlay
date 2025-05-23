const keytar = require('keytar');
const axios = require('axios');
const { shell } = require('electron');
const http = require('http');
const url = require('url');

const CLIENT_ID = 'wlh9bzkshqq4dohkd3c6coyy0od7te';
const CLIENT_SECRET = 'kev';
const REDIRECT_URI = 'http://localhost:5174/callback';

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

const SERVICE = 'TwitchWatcher';
const ACCOUNT = 'tokens';

async function getTokens() {
    const data = await keytar.getPassword(SERVICE, ACCOUNT);
    return data ? JSON.parse(data) : null;
}

async function saveTokens(tokens) {
    tokens.obtained_at = Date.now(); // Сохраняем время получения
    await keytar.setPassword(SERVICE, ACCOUNT, JSON.stringify(tokens));
}

async function refreshTokensIfNeeded() {
    const tokens = await getTokens();
    if (!tokens) return false;

    const { expires_in, obtained_at, refresh_token } = tokens;
    const expiresAt = obtained_at + expires_in * 1000;

    if (Date.now() >= expiresAt) {
        console.log('🔄 Access token expired, refreshing...');
        return await refreshTokens(refresh_token);
    }

    console.log('✅ Access token still valid.');
    return true;
}

async function refreshTokens(refreshToken) {
    try {
        const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
            params: {
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET
            }
        });


        const tokens = response.data;
        const userInfo = await fetchUserInfo(tokens.access_token);
        if (userInfo) {
            tokens.user_id = userInfo.id;
            tokens.login = userInfo.login;
        }
        await saveTokens(tokens);
        console.log('✅ Tokens refreshed.');
        return true;
    } catch (error) {
        console.error('❌ Failed to refresh tokens:', error.response?.data || error.message);
        return false;
    }
}

function startAuthorization() {
    return new Promise((resolve) => {
        const server = http.createServer(async (req, res) => {
            const reqUrl = url.parse(req.url, true);
            if (reqUrl.pathname === '/callback') {
                const authCode = reqUrl.query.code;
                console.log('📥 Authorization Code received: ***');

                const tokens = await exchangeCodeForTokens(authCode);

                if (tokens) {
                    const userInfo = await fetchUserInfo(tokens.access_token);
                    if (userInfo) {
                        tokens.user_id = userInfo.id;
                        tokens.login = userInfo.login;
                    }
                    await saveTokens(tokens);
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end('<h2>Authorization successful! You can close this window.</h2>');
                    resolve(true);
                } else {
                    res.writeHead(500, { 'Content-Type': 'text/html' });
                    res.end('<h2>Authorization failed. Please try again.</h2>');
                    resolve(false);
                }

                server.close();
            } else {
                res.writeHead(404);
                res.end();
            }
        });

        server.listen(5174, () => {
            console.log('🚀 Auth server at http://localhost:5174/callback');
            const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(SCOPES)}`;
            shell.openExternal(authUrl);
        });
    });
}

async function exchangeCodeForTokens(code) {
    try {
        const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
            params: {
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                code,
                grant_type: 'authorization_code',
                redirect_uri: REDIRECT_URI
            }
        });

        console.log('🔑 Tokens received:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ Token exchange error:', error.response?.data || error.message);
        return null;
    }
}

async function authorizeIfNeeded() {
    const tokens = await getTokens();

    if (!tokens) {
        console.log('🔐 No tokens found, starting authorization...');
        return await startAuthorization();
    }

    const refreshed = await refreshTokensIfNeeded();
    if (!refreshed) {
        console.log('🔁 Token refresh failed, restarting authorization...');
        return await startAuthorization();
    }

    return true;
}

async function clearTokens() {
    await keytar.deletePassword(SERVICE, ACCOUNT);
}

async function fetchUserInfo(accessToken) {
    try {
        const response = await axios.get('https://api.twitch.tv/helix/users', {
            headers: {
                'Client-ID': CLIENT_ID,
                'Authorization': `Bearer ${accessToken}`
            }
        });

        return response.data.data[0]; // Первый (и единственный) пользователь
    } catch (error) {
        console.error('❌ Failed to fetch user info:', error.response?.data || error.message);
        return null;
    }
}

module.exports = {
    getTokens,
    authorizeIfNeeded,
    clearTokens,
    fetchUserInfo,
    CLIENT_ID,
};
