
const net = require('net');
const authService = require('./authService');
const messageParser = require('./messageParser');


const HOST = 'irc.chat.twitch.tv';
const PORT = 6667;

let client = null;
let messageHandler = null;

function registerMessageHandler(handler) {
    messageHandler = handler;
}

async function startChat() {
    const tokens = await authService.getTokens();
    if (!tokens) {
        console.error('❌ No tokens found. Cannot connect to IRC.');
        return;
    }

    const accessToken = tokens.access_token;
    const username = tokens.login; // Мы сохранили его в tokens при авторизации
    const channel = username.toLowerCase(); // Twitch требует нижний регистр

    client = new net.Socket();

    client.connect(PORT, HOST, () => {
        console.log('🟢 Connected to Twitch IRC');
        client.write(`CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership\r\n`);
        client.write(`PASS oauth:${accessToken}\r\n`);
        client.write(`NICK ${username}\r\n`);
        client.write(`JOIN #${channel}\r\n`);
    });

    client.on('data', (data) => {
        const messages = data.toString().split('\r\n');

        messages.forEach(message => {
            if (!message) return;

            console.log('📨', message);

            if (message.startsWith('PING')) {
                client.write('PONG :tmi.twitch.tv\r\n');
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
        console.log('🔴 IRC Connection closed.');
    });

    client.on('error', (err) => {
        console.error('❌ IRC Error:', err.message);
    });
}

function stopChat() {
    if (client) {
        client.end();
        client = null;
        console.log('🛑 IRC Connection terminated.');
    }
}

module.exports = {
    startChat,
    stopChat,
    registerMessageHandler,
};
