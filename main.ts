import { app } from 'electron';
import WebSocket from 'ws';
import Store from 'electron-store';
import defaultTheme from './default-theme.json';
import * as chatService from './services/chatService';
import * as eventSubService from './services/esService';
import * as messageCache from './services/MessageCacheManager';
import { MiddlewareProcessor } from './services/middleware/MiddlewareProcessor';
import { ActionTypes } from './services/middleware/ActionTypes';
import { timeoutUser } from './services/authorizedHelixApi';
import { createMainWindow } from "./windowsManager";
import { startHttpServer, startDevStaticServer } from './webServer';
import { registerIpcHandlers } from './ipcHandlers';
import {EVENT_CHANEL, EVENT_FOLLOW, EVENT_REDEMPTION} from "./services/esService";

const appStartTime = Date.now();
let PORT = 5173;

const store = new Store({
  defaults: {
    themes: { default: defaultTheme, theme1: defaultTheme },
    currentTheme: 'default',
  },
});

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
        await chatService.sendMessage(action.payload.message);
      }
      if (action.payload.forwardToUi) {
        const botMessage = {
          type: 'chat',
          username: 'Bot',
          color: '#69ff00',
          rawMessage: '',
          htmlBadges: '<img src="https://i.pinimg.com/originals/0c/e7/6b/0ce76b0e96c23be3331372599395b9da.gif" alt="broadcaster" title="broadcaster" style="vertical-align: middle; height: 1em; margin-right: 2px;" />',
          htmlMessage: action.payload.message,
          id: 'bot_' + crypto.randomUUID(),
          roomId: null,
          userId: null,
          sourceRoomId: null,
          sourceChannel: {},
        } as any;
        setTimeout(async () => {
          await messageCache.addMessage(botMessage);
        }, 1000);
      }
      break;
    case ActionTypes.MUTE_USER:
      await timeoutUser(action.payload.userId, action.payload.duration, action.payload.reason);
      break;
    default:
      console.warn(`⚠️ Unknown action type: ${action.type}`);
      break;
  }
};

const middlewareProcessor = new MiddlewareProcessor(applyAction);
middlewareProcessor.onThemeUpdated(currentTheme.bot);

const wss = new WebSocket.Server({ port: 42001 });

function broadcast(channel: string, payload: any) {
  const message = JSON.stringify({ channel, payload });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

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
      messageCache
  );

  wss.on('connection', (ws) => {
    ws.on('message', (message) => {
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

  chatService.registerMessageHandler(async (parsedMessage) => {
    const result = await middlewareProcessor.processMessage(parsedMessage);
    if (result) {
      messageCache.addMessage(result);
    }
  });

  messageCache.registerMessageHandler(({ messages, showSourceChannel }) => {
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

function migrateTheme(theme: any) {
  if (theme && theme.followMessage && !Array.isArray(theme.followMessage)) {
    theme.followMessage = [theme.followMessage];
  }
  if (theme && theme.redeemMessage && !Array.isArray(theme.redeemMessage)) {
    theme.redeemMessage = [theme.redeemMessage];
  }
  return theme;
}
