const { app, BrowserWindow, ipcMain } = require('electron');
const authService = require('./services/authService');
const eventSubService = require('./services/eventSubService');
const chatService = require('./services/chatService');
const messageParser = require('./services/messageParser');
const messageCache = require('./services/MessageCacheManager');
const { EVENT_FOLLOW, EVENT_REDEMPTION, EVENT_CHANEL } = require('./channels.js');
const Store     = require('electron-store');
const defaultTheme = require('./default-theme.json')
const path = require('path');
const express = require('express');

let PORT = 5173;

const store = new Store({
    defaults: {
        themes: {
            default: defaultTheme,
            theme1: defaultTheme,

        },
        currentTheme: "default"
    }
});

const WebSocket = require('ws');

let currentThemeName = store.get('currentTheme') || "default";
let currentTheme = store.get('themes')[currentThemeName] || require('./default-theme.json');
messageCache.updateSettings({
    lifetime: currentTheme.allMessages?.lifetime ?? 60,
    maxCount: currentTheme.allMessages?.maxCount ?? 6,
});

const wss = new WebSocket.Server({ port: 42001 });

let mainWindow = null;
let chatWindow = null;
let previewWindow = null;


function startHttpServer() {
    const appServer = express();
    const distPath = path.join(__dirname, 'dist');

    appServer.use(express.static(distPath));
    appServer.get("/", (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
    appServer.use((req, res, next) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });

    //PORT = 3333;
    // TODO add custom port for prod builds
    appServer.listen(PORT, () => {
        console.log(`🌐 HTTP сервер запущен на http://localhost:${PORT}`);
    });
}

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

function createWindow(port) {
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
    const isDev = !app.isPackaged;

    if (!isDev) {
        startHttpServer();
    }

    createWindow(isDev ? 5173 : PORT);

    wss.on('connection', (ws) => {
        ws.on('message', (message) => {
            console.log('Получено сообщение от клиента:', message.toString());
            const { channel, payload } = JSON.parse(message.toString());
            switch (channel) {
                case 'theme:get-all':
                    const themes = store.get('themes');
                    console.log('Запрошены все темы, отправляем:', themes);
                    broadcast('themes:get', { themes, currentThemeName });
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

    ipcMain.handle('auth:getAccountInfo', async () => {
        return await authService.getAccountInfo();
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

    ipcMain.handle('theme:create', async (event, newThemeName) => {
        const themes = store.get('themes');
        themes[newThemeName] = defaultTheme;
        store.set('themes', themes);
        broadcast('themes:get', { themes, currentThemeName });
    })

    ipcMain.handle('theme:set', async (event, themeName) => {
        const themes = store.get('themes');
        if (themes[themeName]) {
            currentThemeName = themeName;
            currentTheme = themes[themeName];
            store.set('currentTheme', themeName);
            messageCache.updateSettings({
                lifetime: currentTheme.allMessages?.lifetime ?? 60,
                maxCount: currentTheme.allMessages?.maxCount ?? 6,
            });
            broadcast('theme:update', currentTheme);
            broadcast('themes:get', { themes, currentThemeName });
        } else {
            console.error(`Тема "${themeName}" не найдена.`);
        }
    })

    ipcMain.handle('theme:import', async (_event, { name, theme }) => {
        const themes = store.get('themes');
        themes[name] = theme;
        store.set('themes', themes);
        broadcast('themes:get', { themes, currentThemeName });
    });

    ipcMain.handle('theme:delete', async (_event, name) => {
        const themes = store.get('themes');
        if (themes[name]) {
            delete themes[name];
            store.set('themes', themes);
            if (currentThemeName === name) {
                currentThemeName = 'default';
                currentTheme = themes[currentThemeName] || defaultTheme;
                store.set('currentTheme', currentThemeName);
                messageCache.updateSettings({
                    lifetime: currentTheme.allMessages?.lifetime ?? 60,
                    maxCount: currentTheme.allMessages?.maxCount ?? 6,
                });
                broadcast('theme:update', currentTheme);
            }
            broadcast('themes:get', { themes, currentThemeName });
        }
    });

    eventSubService.registerEventHandlers((destination, parsedEvent) => {
        if (destination === `${EVENT_CHANEL}:${EVENT_FOLLOW}`) {
            messageCache.addMessage({
                id: `follow_${Date.now()}_${parsedEvent.userId}`,
                type: 'follow',
                ...parsedEvent
            });
        } else if (destination === `${EVENT_CHANEL}:${EVENT_REDEMPTION}`) {
            const rewardId = parsedEvent.reward?.id || Date.now();
            messageCache.addMessage({
                id: `redemption_${Date.now()}_${parsedEvent.userId}_${rewardId}`,
                type: 'redemption',
                ...parsedEvent
            });
        } else {
            broadcast(destination, parsedEvent);
        }
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

ipcMain.on('theme:update', (_e, theme, name) => {
    currentTheme = theme;
    const themes = store.get('themes');
    themes[name] = theme;
    store.set('themes', themes);
    messageCache.updateSettings({
        lifetime: currentTheme.allMessages?.lifetime ?? 60,
        maxCount: currentTheme.allMessages?.maxCount ?? 6,
    });
    broadcast('theme:update', theme);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    app.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
    app.exit(1);
});

app.on('window-all-closed', () => {
    app.quit();
});