
const net = require('net');
const authService = require('./authService');
const messageParser = require('./messageParser');


const HOST = 'irc.chat.twitch.tv';
const PORT = 6667;

let client = null;
let messageHandler = null;
let isStopping = false;
let isConnecting = false;
let lastEventTimestamp = Date.now();

// reconnect when auth tokens are refreshed
authService.onTokenRefreshed(() => {
    if (client && !isStopping) {
        console.log('🔄 Tokens refreshed, reconnecting IRC...');
        handleAuthFailure();
    }
});

function registerMessageHandler(handler) {
    messageHandler = handler;
}

async function startChat() {
    isStopping = false;
    if (client && !client.destroyed) {
        console.log('ℹ️ IRC already connected.');
        return;
    }
    if (isConnecting) {
        console.log('⏳ IRC connection already in progress.');
        return;
    }
    await connect();
}

async function handleAuthFailure() {
    const tokens = await authService.getTokens();
    if (!tokens) {
        console.error('❌ Token refresh failed or user logged out. Stopping IRC.');
        stopChat();
        return;
    }
    console.log('🔄 Reconnecting to IRC with refreshed token...');
    if (client) {
        client.removeAllListeners();
        client.destroy();
        client = null;
    }
    if (!isStopping) {
        await connect();
    }
}

async function connect() {
    if (client && !client.destroyed) {
        console.log('ℹ️ IRC already connected.');
        return;
    }
    if (isConnecting) {
        console.log('⏳ IRC connection already in progress.');
        return;
    }
    isConnecting = true;
    const tokens = await authService.getTokens();
    if (!tokens) {
        console.error('❌ No tokens found. Cannot connect to IRC.');
        isConnecting = false;
        return;
    }

    const accessToken = tokens.access_token;
    const username = tokens.login; // Мы сохранили его в tokens при авторизации
    const channel = username.toLowerCase(); // Twitch требует нижний регистр

    client = new net.Socket();

    client.connect(PORT, HOST, () => {
        isConnecting = false;
        lastEventTimestamp = Date.now();
        console.log('🟢 Connected to Twitch IRC');
        client.write(`CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership\r\n`);
        client.write(`PASS oauth:${accessToken}\r\n`);
        client.write(`NICK ${username}\r\n`);
        client.write(`JOIN #${channel}\r\n`);
    });

    client.on('data', (data) => {
        lastEventTimestamp = Date.now();
        const messages = data.toString().split('\r\n');

        messages.forEach(message => {
            if (!message) return;

            console.log('📨', message);

            if (message.startsWith('PING')) {
                client.write('PONG :tmi.twitch.tv\r\n');
                return;
            }

            if (/authentication failed/i.test(message)) {
                console.warn('⚠️ IRC authentication failed.');
                handleAuthFailure();
                return;
            }

            const parsed = messageParser.parseIrcMessage(message);

            if (parsed) {
                console.log(`${parsed.username}: ${parsed.rawMessage}`);
                console.log('Баджи:', parsed.htmlBadges);
                console.log('HTML для рендера:', parsed.htmlMessage);

                if (messageHandler && parsed) {
                    messageHandler(parsed);
                }
            }
        });
    });

    client.on('close', () => {
        isConnecting = false;
        console.log('🔴 IRC Connection closed.');
    });

    client.on('error', (err) => {
        isConnecting = false;
        console.error('❌ IRC Error:', err.message);
    });
}

function stopChat() {
    if (client) {
        client.end();
        client = null;
        console.log('🛑 IRC Connection terminated.');
    }
    isStopping = true;
    isConnecting = false;
}

module.exports = {
    startChat,
    stopChat,
    registerMessageHandler,
    getLastEventTimestamp: () => lastEventTimestamp,
};
