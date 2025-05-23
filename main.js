const { app, BrowserWindow, ipcMain } = require('electron');
const authService = require('./services/authService');
const eventSubService = require('./services/eventSubService');
const chatService = require('./services/chatService');
const messageParser = require('./services/messageParser');
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 42001 });

let mainWindow;
let chatWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
    });

    mainWindow.loadURL('http://localhost:5173');
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
    chatWindow.loadURL('http://localhost:5173/chat-overlay'); // Используем роутинг для overlay
}

app.whenReady().then(() => {
    console.log('🚀 Electron App is ready.');
    createWindow();

    // Если нужны IPC хендлеры, регистрируем их прямо тут
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

    eventSubService.registerEventHandlers( (destination, parsedEvent) => {
        broadcast(destination, parsedEvent);
        //withChatWindow(chatWindow, (window) => {
        //    window.webContents.send('event:follow', parsedEvent);
        //});
    });

    chatService.registerMessageHandler((parsedMessage) => {
        broadcast('chat:message', parsedMessage);
        //withChatWindow(chatWindow, (window) => {
        //    window.webContents.send('chat:message', parsedMessage);
        //});
    });

});

function withChatWindow(chatWindow, action) {
    if (chatWindow && !chatWindow.isDestroyed()) {
        action(chatWindow);
    } else {
        console.warn('⚠️ Overlay window is not available.');
    }
}


function broadcast(channel, payload) {
    const message = JSON.stringify({ channel, payload });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}