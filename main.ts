import {app} from 'electron';
import WebSocket from 'ws';
import Store from 'electron-store';
import defaultTheme from './default-theme.json';
import * as messageCache from './services/MessageCacheManager';
import {MiddlewareProcessor} from './services/middleware/MiddlewareProcessor';
import {ActionTypes} from './services/middleware/ActionTypes';
import {timeoutUser} from './services/twitch/authorizedHelixApi';
import {createMainWindow, mainWindow} from "./windowsManager";
import {startDevStaticServer, startHttpServer, stopAllServers} from './webServer';
import {registerIpcHandlers} from './ipcHandlers';
import {EVENT_CHANEL, EVENT_FOLLOW, EVENT_REDEMPTION} from "./services/twitch/esService";
import {ChatEvent, createBotMessage, emptyRoles} from "./services/twitch/messageParser";
import {LogService} from "./services/logService";
import {UserData} from "./services/twitch/types/UserData";
import {TwitchClient} from "./services/twitch/TwitchClient";
import {YouTubeLiveStreamsScraper} from "./services/youtube/YouTubeLiveStreamsScraper";
import {AudiosessionManager} from "./audiosessionManager";
import {BotConfig, PingPongCommandConfig, StoreSchema, ThemeConfig} from "./services/store/StoreSchema";
import {ProxyService} from "./services/ProxyService";
import {BotConfigService} from "./services/BotConfigService";
import {DbRepository} from "./services/db/DbRepository";

const appStartTime = Date.now();
let PORT = 5173;

const store = new Store<StoreSchema>({
  defaults: {
    themes: {
      default: defaultTheme as ThemeConfig,
      theme1: defaultTheme as ThemeConfig
    },
    bots: {  },
    currentBot: null,
    currentTheme: 'default',
    audio: {
      fft: {
        enabled: true,
        device: null,
        dbFloor: -70,
        masterGain: 2,
        tilt: 0.30,
      },
      gsm: {
        enabled: true,
      },
    },
    youtube: {
        enabled: false,
        channelId: '',
        videoId: '',
    }
  },
});

const wss = new WebSocket.Server({ port: 42001 });

const logService = new LogService((logs) => {
  broadcast('log:updated', { logs });
}, 100);

const audiosessionManager = new AudiosessionManager(store, logService);
const proxy = new ProxyService();

/* Theme migration */
let themes: any = store.get('themes');
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
  console.log('Темы были мигрированы и сохранены');
}
let currentThemeName: string = (store.get('currentTheme') as string) || 'default';

let currentTheme = themes[currentThemeName] || defaultTheme;
messageCache.updateSettings({
  lifetime: currentTheme.allMessages?.lifetime ?? 60,
  maxCount: currentTheme.allMessages?.maxCount ?? 6,
});

const applyAction = async (action: { type: string; payload: any }) => {
  console.log(`🔧 Applying action: ${action.type}`, action);
  switch (action.type) {
    case ActionTypes.SEND_MESSAGE:
      if (action.payload.message) {
        await twitchClient.sendMessage(action.payload.message);
      }
      if (action.payload.forwardToUi) {
        setTimeout(async () => {
          const botMessage: ChatEvent = createBotMessage(action.payload.message);
          messageCache.processMessage(botMessage);
        }, 1000);
      }
      break;
    case ActionTypes.MUTE_USER:
      await timeoutUser(action.payload.userId, action.payload.duration, action.payload.reason);
      const muteMessage = `Пользователь был замьючен на ${action.payload.duration} секунд`;
      logService.log({
        message: muteMessage,
        timestamp: new Date().toISOString(),
        userId: action.payload.userId,
        userName: action.payload.userName || 'unknown',
      });
      break;
    default:
      console.warn(`⚠️ Unknown action type: ${action.type}`);
      break;
  }
};

const middlewareProcessor = new MiddlewareProcessor(applyAction, logService, store);

const twitchClient = new TwitchClient(
  logService,
  (editors: UserData[]) => {
    middlewareProcessor.setEditors(editors);
  },
  () => {
    console.log('Twitch client logged out');
    mainWindow?.webContents?.send("logout:success");
  }
);

const botService = new BotConfigService(
    store,
    (newConfig: BotConfig) => {
        middlewareProcessor.onThemeUpdated(newConfig);
    }
)

const scraper = new YouTubeLiveStreamsScraper(
    store,
    message => {
      if (!message || !message.type || message.type !== 'chat') {
        return;
      }
      messageCache.processMessage({
        type: 'chat',
        userName: message.author,
        color: '#ffffff',
        rawMessage: message.text ?? "",
        htmlMessage: message.text ?? "",
        htmlBadges: "",
        id: 'yt_' + crypto.randomUUID(),
        roomId: null,
        sourceRoomId: null,
        userId: null,
        sourceChannel: {displayName:null, login:null, avatarUrl:null},
        roles: emptyRoles,
        timestamp: Date.now(),
        userNameRaw: message.author,
      })
      console.log('YouTube message received:\n', JSON.stringify(message, null, 2));
    },
    proxy
);

function broadcast(channel: string, payload: any) {
  const message = JSON.stringify({ channel, payload });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

twitchClient.on('event', async ({ destination, event }) => {
  if (destination === `${EVENT_CHANEL}:${EVENT_FOLLOW}`) {
    messageCache.processMessage(event);
  } else if (destination === `${EVENT_CHANEL}:${EVENT_REDEMPTION}`) {
    const result = await middlewareProcessor.processMessage(event);
    messageCache.processMessage(result);
  } else {
    broadcast(destination, event);
  }
});

twitchClient.on('chat', async (parsedMessage) => {
  const result = await middlewareProcessor.processMessage(parsedMessage);
  if (result) {
    messageCache.processMessage(result);
  }
});
app.commandLine.appendSwitch('lang', 'en-US');
app.whenReady().then(() => {
  const isDev = !app.isPackaged;
  if (isDev) {
    startDevStaticServer();
  } else {
    startHttpServer(PORT);
  }
  createMainWindow('http://localhost:5173/loading');
  registerIpcHandlers(
      store as any,
      broadcast,
      middlewareProcessor,
      appStartTime,
      () => currentTheme,
      (name: string, theme: any) => {
          currentThemeName = name;
          currentTheme = theme;
      },
      messageCache,
      logService,
      twitchClient,
      () => {
        twitchClient.refreshUser().then((userId) => {
          middlewareProcessor.onUserUpdated(userId)
        });


      }
  );
  audiosessionManager.registerIPCs();
  scraper.setupIPCs();

  wss.on('connection', (ws) => {
    ws.on('message', (message) => {
      const { channel, payload } = JSON.parse(message.toString());
      switch (channel) {
        case 'theme:get-all':
          const themes = store.get('themes');
          broadcast('themes:get', { themes, currentThemeName });
          break;
        case 'theme:get-by-name':
            const themeName = payload.name;
            const theme = store.get('themes')[themeName];
            if (theme) {
                broadcast('theme:update-by-name', { name: themeName, theme: theme });
            } else {
                console.warn(`Theme "${themeName}" not found`);
            }
            break;
        case 'theme:get':
          broadcast('theme:update', currentTheme);
          break;
        case 'status:get_broadcasting':
          twitchClient.checkBroadcastingStatus().then(isLive => {});
          break;
        case 'event:get-new-followers-count':
          twitchClient.broadcastNewFollowersPerStream()
          break;
        case 'log:get':
            const logs = logService.getLogs();
            broadcast('log:updated', { logs });
            break;
        default:
          console.log('unknown channel', channel, payload);
      }
    });
  });

  messageCache.registerMessageHandler(({ messages, showSourceChannel }) => {
    console.log('📦 Sending cached messages to clients:', messages.map(msg => msg.id));
    broadcast('chat:messages', { messages: Array.from(messages), showSourceChannel });
  });
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  app.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  app.exit(1);
});
app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', async (event) => {
  event.preventDefault();
  scraper.dispose();
  twitchClient.stop()
  audiosessionManager.close();
  wss.clients.forEach((client) => {
    client.close();
  });
  wss.close();
  await stopAllServers();

  setTimeout(() => {
    const remaining = (process as any)._getActiveHandles?.()?.length || 0;
    console.log(`Final check: ${remaining} handles remaining`);
    process.exit(0);
  }, 500);
});

function migrateTheme(theme: any) {
  if (!theme) return theme;

  // 1
  if (theme && theme.followMessage && !Array.isArray(theme.followMessage)) {
    theme.followMessage = [theme.followMessage];
  }
  if (theme && theme.redeemMessage && !Array.isArray(theme.redeemMessage)) {
    theme.redeemMessage = [theme.redeemMessage];
  }
  // 2
  const defaultTitleFont = {
    family: 'Roboto',
    url: 'https://fonts.gstatic.com/s/roboto/v48/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbWmTggvWl0Qn.ttf'
  };

  const defaultMessageFont = {
    family: 'Roboto',
    url: 'https://fonts.gstatic.com/s/roboto/v48/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbWmTggvWl0Qn.ttf',
    color: '#ffffff',
    alpha: '1'
  };

  if (!theme.chatMessage) theme.chatMessage = defaultTheme.chatMessage || {};
  if (!theme.chatMessage.titleFont)   theme.chatMessage.titleFont   = { ...defaultTitleFont };
  if (!theme.chatMessage.messageFont) theme.chatMessage.messageFont = { ...defaultMessageFont };

  const ensureMessageFont = (msgs?: any[]) => {
    if (!Array.isArray(msgs)) return;
    for (const msg of msgs) {
      if (msg && !msg.messageFont) {
        msg.messageFont = { ...defaultMessageFont };
      }
    }
  };

  ensureMessageFont(theme.followMessage);
  ensureMessageFont(theme.redeemMessage);

  return theme;
}
