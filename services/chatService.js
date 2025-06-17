
const net = require('net');
const authService = require('./authService');
const messageParser = require('./messageParser');


const HOST = 'irc.chat.twitch.tv';
const PORT = 6667;

class ChatService {
    constructor() {
        this.client = null;
        this.messageHandler = null;
        this.isStopping = false;
        this.isConnecting = false;
        this.lastEventTimestamp = Date.now();

        authService.onTokenRefreshed(() => {
            if (this.client && !this.isStopping) {
                console.log('🔄 Tokens refreshed, reconnecting IRC...');
                this.handleAuthFailure();
            }
        });
    }

    registerMessageHandler(handler) {
        this.messageHandler = handler;
    }

    async startChat() {
        this.isStopping = false;
        if (this.client && !this.client.destroyed) {
            console.log('ℹ️ IRC already connected.');
            return;
        }
        if (this.isConnecting) {
            console.log('⏳ IRC connection already in progress.');
            return;
        }
        await this.connect();
    }

    async handleAuthFailure() {
        const tokens = await authService.getTokens();
        if (!tokens) {
            console.error('❌ Token refresh failed or user logged out. Stopping IRC.');
            this.stopChat();
            return;
        }
        console.log('🔄 Reconnecting to IRC with refreshed token...');
        if (this.client) {
            this.client.removeAllListeners();
            this.client.destroy();
            this.client = null;
        }
        if (!this.isStopping) {
            await this.connect();
        }
    }

    async connect() {
        if (this.client && !this.client.destroyed) {
            console.log('ℹ️ IRC already connected.');
            return;
        }
        if (this.isConnecting) {
            console.log('⏳ IRC connection already in progress.');
            return;
        }
        this.isConnecting = true;
        const tokens = await authService.getTokens();
        if (!tokens) {
            console.error('❌ No tokens found. Cannot connect to IRC.');
            this.isConnecting = false;
            return;
        }

        const accessToken = tokens.access_token;
        const username = tokens.login; // Мы сохранили его в tokens при авторизации
        const channel = username.toLowerCase(); // Twitch требует нижний регистр

        const socket = new net.Socket();
        this.client = socket;

        socket.connect(PORT, HOST, () => {
            this.isConnecting = false;
            this.lastEventTimestamp = Date.now();
            console.log('🟢 Connected to Twitch IRC');
            socket.write(`CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership\r\n`);
            socket.write(`PASS oauth:${accessToken}\r\n`);
            socket.write(`NICK ${username}\r\n`);
            socket.write(`JOIN #${channel}\r\n`);
        });

        socket.on('data', (data) => {
            this.lastEventTimestamp = Date.now();
            const messages = data.toString().split('\r\n');

            messages.forEach(message => {
                if (!message) return;

                console.log('📨', message);

                if (message.startsWith('PING')) {
                    socket.write('PONG :tmi.twitch.tv\r\n');
                    return;
                }

                if (/authentication failed/i.test(message)) {
                    console.warn('⚠️ IRC authentication failed.');
                    this.handleAuthFailure();
                    return;
                }

                const parsed = messageParser.parseIrcMessage(message);

                if (parsed) {
                    console.log(`${parsed.username}: ${parsed.rawMessage}`);
                    console.log('Баджи:', parsed.htmlBadges);
                    console.log('HTML для рендера:', parsed.htmlMessage);

                    if (this.messageHandler && parsed) {
                        this.messageHandler(parsed);
                    }
                }
            });
        });

        socket.on('close', () => {
            this.isConnecting = false;
            console.log('🔴 IRC Connection closed.');
        });

        socket.on('error', (err) => {
            this.isConnecting = false;
            console.error('❌ IRC Error:', err.message);
        });
    }

    stopChat() {
        if (this.client) {
            this.client.end();
            this.client = null;
            console.log('🛑 IRC Connection terminated.');
        }
        this.isStopping = true;
        this.isConnecting = false;
    }

    getLastEventTimestamp() {
        return this.lastEventTimestamp;
    }
}

const instance = new ChatService();

module.exports = {
    startChat: (...args) => instance.startChat(...args),
    stopChat: (...args) => instance.stopChat(...args),
    registerMessageHandler: (handler) => instance.registerMessageHandler(handler),
    getLastEventTimestamp: () => instance.getLastEventTimestamp(),
};
