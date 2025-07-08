const { app, BrowserWindow, ipcMain, shell  } = require('electron');
const authService = require('./services/authService');
const eventSubService = require('./services/esService');
const chatService = require('./services/chatService');
const messageParser = require('./services/messageParser');
const messageCache = require('./services/MessageCacheManager');
const { EVENT_FOLLOW, EVENT_REDEMPTION, EVENT_CHANEL } = require('./channels.js');
const Store     = require('electron-store');
const defaultTheme = require('./default-theme.json')
const path = require('path');
const express = require('express');
const fs = require('fs');

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
/*
* ==================== theme migration ====================
* */
let themes = store.get('themes');

let migrated = false;
for (const name of Object.keys(themes)) {
    const original = themes[name];
    const migratedTheme = migrateTheme({ ...original });
    if (JSON.stringify(migratedTheme) !== JSON.stringify(original)) {
        themes[name] = migratedTheme;
        migrated = true;
    }
}

if (migrated) {
    store.set('themes', themes);
    console.log('Темы были мигрированы и сохранены ', JSON.stringify(themes, null, 2));
}

/*
* ===================== theme migration end ====================
* */

let currentThemeName = store.get('currentTheme') || "default";
let currentTheme = themes[currentThemeName] || require('./default-theme.json');

messageCache.updateSettings({
    lifetime: currentTheme.allMessages?.lifetime ?? 60,
    maxCount: currentTheme.allMessages?.maxCount ?? 6,
});

const WebSocket = require('ws');
const {urlencoded} = require("express");
const appStartTime = Date.now();

const wss = new WebSocket.Server({ port: 42001 });

let mainWindow = null;
let chatWindow = null;
let previewWindow = null;


function startHttpServer() {
    const appServer = express();
    const distPath = path.join(__dirname, 'dist');

    const userDataPath = path.join(app.getPath('userData'), 'images');
    appServer.use(express.static(distPath));
    appServer.use('/images', express.static(userDataPath));
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

function startDevStaticServer() {
    const devServer = express();
    const distPath = path.join(__dirname, 'dist');

    const userDataPath = path.join(app.getPath('userData'), 'images');
    devServer.use(express.static(distPath));
    devServer.use('/images', express.static(userDataPath));
    /*appServer.get("/", (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
    appServer.use((req, res, next) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });*/

    const DEV_PORT = 5123; // check vite.config.js also

    devServer.listen(DEV_PORT, () => {
        console.log(`🌐 HTTP сервер (для картинок) запущен на http://localhost:${DEV_PORT}`);
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

    if (isDev) {
        startDevStaticServer();
    } else {
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
                    broadcast('themes:get', { themes, currentThemeName });
                    break;
                case 'theme:get':
                    broadcast('theme:update', currentTheme);
                    break;
                default:
                    console.log('unknown channel', channel, payload);
            }
        });
    });

    ipcMain.handle('auth:authorize', async () => {
        const result = await authService.authorizeIfNeeded();
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
        // TEST CHEER EMOTES
        /*setTimeout(() => {
            messageParser.parseIrcMessage("@badge-info=;badges=moderator/1,subtember-2024/1;bits=1;color=#8A2BE2;display-name=edna_nya;emotes=;first-msg=0;flags=;id=2179eb06-7e0c-473e-81d0-edb823ff3dd2;mod=1;returning-chatter=0;room-id=1015100674;subscriber=0;tmi-sent-ts=1751552575713;turbo=0;user-id=506654373;user-type=mod :edna_nya!edna_nya@edna_nya.tmi.twitch.tv PRIVMSG #ellis_leaf :SeemsGood1")
                .then((parsedMessage => {
                    messageCache.addMessage(parsedMessage)
                }))
        }, 5000);*/

        // TEST FOLLOW EVENT
        /*setTimeout(() => {
            const event = {
                userId: "asd",
                userLogin: "dsadsa",
                userName: "dsdsddssds",
                followedAt: new Date().toISOString()
            };
            messageCache.addMessage({
                id: `follow_${Date.now()}_asd`,
                type: 'follow',
                ...event
            });
        }, 10000);*/

        const tokens = await authService.getTokens();
        console.log('🎉 Starting Twitch IRC Chat...');
        chatService.startChat();
        console.log('🎉 Ready to work with Twitch API!');
        eventSubService.start();
        messageParser.loadGlobalBadges().then(r => {
            console.log("✅ GlobalBadges loaded!");
        });
        messageParser.loadChannelBadges().then(r => {
            console.log("✅ ChannelBadges loaded!");
        });
        messageParser.load7tvGlobalEmotes().then(r => {
            console.log("✅ 7TV Global Emotes loaded!");
        });
        messageParser.loadBTTVGlobalEmotes().then(r => {
            console.log("✅ BTTV Global Emotes loaded!");
        });
        messageParser.loadCheerEmotes().then(r => {
            console.log("✅ Cheer Emotes loaded!");
        });
    });

    ipcMain.handle('chat:open-overlay', () => {
        createChatWindow();
    });

    ipcMain.handle('setting:open-preview', () => {
       createPreviewWindow();
    });

    ipcMain.handle('utils:open_url', async (_event, url) => {
        await shell.openExternal(url);
    });

    ipcMain.handle('system:get-stats', () => {
        return {
            startTime: appStartTime,
            lastEventSub: eventSubService.getLastEventTimestamp(),
            lastIRC: chatService.getLastEventTimestamp(),
        };
    });

    ipcMain.handle('system:reconnect', async () => {
        // Ignore the automatic reconnect triggered on close so we don't create
        // duplicate EventSub connections when manually restarting
        eventSubService.stop({ setStopping: false, ignoreClose: true });
        chatService.stopChat();
        eventSubService.start();
        chatService.startChat();
        return true;
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

    messageCache.registerMessageHandler(({ messages, showSourceChannel }) => {
        broadcast('chat:messages', {
            messages: Array.from(messages),
            showSourceChannel
        });
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

ipcMain.handle('utils:save_image_buffer', async (event, fileName, buffer) => {
    const saveDir = path.join(app.getPath('userData'), 'images');
    await fs.promises.mkdir(saveDir, { recursive: true });

    const fullPath = path.join(saveDir, fileName);
    await fs.promises.writeFile(fullPath, Buffer.from(buffer));

    return `file://${fullPath}`;
});

ipcMain.handle('utils:get_image_url', (event, fileName) => {
    const path = encodeURIComponent(fileName)
    return `/images/${path}`;
})

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



/*
* Theme migrator
* */
function migrateTheme(theme) {
    if (theme && theme.followMessage && !Array.isArray(theme.followMessage)) {
        theme.followMessage = [theme.followMessage];
    }
    if (theme && theme.redeemMessage && !Array.isArray(theme.redeemMessage)) {
        theme.redeemMessage = [theme.redeemMessage];
    }
    return theme;
}