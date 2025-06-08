const { app, BrowserWindow, ipcMain } = require('electron');
const authService = require('./services/authService');
const eventSubService = require('./services/eventSubService');
const chatService = require('./services/chatService');
const messageParser = require('./services/messageParser');
const messageCache = require('./services/MessageCacheManager');
const Store     = require('electron-store');
const defaultTheme = require('./default-theme.json')

const store = new Store({
    defaults: {
        themes: { default: defaultTheme }
    }
});

const WebSocket = require('ws');

let currentTheme = store.get('themes')["default"] || require('./default-theme.json');

const wss = new WebSocket.Server({ port: 42001 });

let mainWindow = null;
let chatWindow = null;
let previewWindow = null;

function createPreviewWindow() {
    previewWindow = new BrowserWindow({
        width: 450,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
    });

    previewWindow.loadURL('http://localhost:5173/preview');
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
    });

    mainWindow.loadURL('http://localhost:5173/loading');
}

function createChatWindow() {
    if (chatWindow && !chatWindow.isDestroyed()) {
        chatWindow.focus();
        return;
    }

    chatWindow = new BrowserWindow({
        width: 400,
        height: 600,
        //frame: false, // Убираем рамки окна (для OBS)
        //alwaysOnTop: true, // Поверх других окон
        //transparent: true, // Прозрачный фон (если нужно)
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });
    chatWindow.loadURL('http://localhost:5173/chat-overlay');
}

app.whenReady().then(() => {
    console.log('🚀 Electron App is ready.');
    createWindow();

    wss.on('connection', (ws) => {
        ws.on('message', (message) => {
            console.log('Получено сообщение от клиента:', message.toString());
            const { channel, payload } = JSON.parse(message.toString());
            switch (channel) {
                case 'theme:get-all':
                    const themes = store.get('themes');
                    console.log('Запрошены все темы, отправляем:', themes);
                    broadcast('themes:get', themes);
                    break;
                case 'theme:get':
                    console.log('Запрошена тема, отправляем текущую:', currentTheme);
                    broadcast('theme:update', currentTheme);
                    break;
                default:
                    console.log('unknown channel', channel, payload);
            }
        });
    });

    ipcMain.handle('auth:authorize', async () => {
        const result = await authService.authorizeIfNeeded();
        console.log("authorize result", result);
        return result;
    });

    ipcMain.handle('auth:getTokens', async () => {
        return await authService.getTokens();
    });

    ipcMain.handle('auth:logout', async () => {
        await authService.clearTokens();
        eventSubService.stop();
        chatService.stopChat();
        return true;
    });

    ipcMain.handle('auth:onAccountReady', async () => {
        const tokens = await authService.getTokens();
        console.log('🎉 Starting Twitch IRC Chat...');
        chatService.startChat();
        console.log('🎉 Ready to work with Twitch API! Token:', tokens.access_token);
        eventSubService.start();
        messageParser.loadGlobalBadges().then(r => {
            console.log("GlobalBadges loaded!");
        });
        messageParser.loadChannelBadges().then(r => {
            console.log("ChannelBadges loaded!");
        });
    });

    ipcMain.handle('chat:open-overlay', () => {
        createChatWindow();
    });

    ipcMain.handle('setting:open-preview', () => {
       createPreviewWindow();
    });

    eventSubService.registerEventHandlers((destination, parsedEvent) => {
        broadcast(destination, parsedEvent);
    });

    chatService.registerMessageHandler((parsedMessage) => {
        broadcast('chat:message', parsedMessage);
        messageCache.addMessage(parsedMessage);
    });

    messageCache.registerMessageHandler((messages) => {
        console.log('📨 Отправка кэша сообщений в WebSocket:', JSON.stringify(messages));
        broadcast('chat:messages', Array.from(messages.values()));
    });

});

function broadcast(channel, payload) {
    const message = JSON.stringify({ channel, payload });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

ipcMain.on('theme:update', (_e, theme) => {
    currentTheme = theme;
    const themes = store.get('themes');
    themes['default'] = theme;
    store.set('themes', themes);
    broadcast('theme:update', theme);
});