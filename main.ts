import {app, ipcMain} from 'electron';
import WebSocket from 'ws';
import Store from 'electron-store';
import defaultTheme from './default-theme.json';
import * as messageCache from './services/MessageCacheManager';
import {MiddlewareProcessor} from './services/middleware/MiddlewareProcessor';
import {ActionTypes} from './services/middleware/ActionTypes';
import {
    timeoutUser,
    addVip,
    removeVip,
    addModerator,
    removeModerator,
    deleteMessage,
    sendShoutout,
    removeTimeoutOrBan,
    getExtendedUser,
    type ExtendedTwitchUser,
} from './services/twitch/authorizedHelixApi';
import {updateRoles as updateUserRoles} from './services/twitch/roleUpdater';
import {ActionScheduler} from './services/ActionScheduler';
import {createMainWindow, mainWindow, initWindowsManager} from "./windowsManager";
import {startDevStaticServer, startHttpServer, stopAllServers} from './webServer';
import {registerIpcHandlers} from './ipcHandlers';
import {EVENT_CHANEL, EVENT_FOLLOW, EVENT_REDEMPTION, EVENT_RAID, EVENT_BROADCASTING} from "./services/twitch/esService";
import {ChatStatsService} from "./services/ChatStatsService";
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
import {AppLocaleRepository} from "./services/locale/AppLocaleRepository";
import {BackendLogService} from "./services/BackendLogService";
import {MediaEventsController} from "./services/MediaEventsController";
import {MediaEventsService} from "./services/MediaEventsService";
import {ObsService} from "./services/ObsService";
import {RemoteGatewayService, type GatewayUserProfile, type ModerationDeps} from "./services/RemoteGatewayService";
import {MediaDisplayGroupService} from "./services/MediaDisplayGroupService";
import {MediaLibraryService} from "./services/MediaLibraryService";
import {DocsService} from "./services/DocsService";
import {DonationAlertsService} from "./services/DonationAlertsService";
import fs from 'fs';
import path from 'path';

const appStartTime = Date.now();
let PORT = 5173;
const DEFAULT_LOCALE = 'ru';

const store = new Store<StoreSchema>({
  defaults: {
    themes: {
      default: defaultTheme as ThemeConfig,
      theme1: defaultTheme as ThemeConfig
    },
    locale: DEFAULT_LOCALE,
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
    },
    irc: {
        useWebSocket: false,  // Default to TCP
    },
    logging: {
        writeToFile: false,
    },
    chatWindow: {
        width: 400,
        height: 640,
        gameMode: false,
    },
    mediaEvents: [],
    mediaDisplayGroups: [],
    mediaOverlaySettings: {
      customResolution: {
        enabled: false,
        width: 1600,
        height: 900,
        color: '#f59e0b',
        label: 'Custom'
      }
    },
    mediaLibrary: [],
    obsActions: [],
    obsConnection: {
      enabled: false,
      host: 'localhost',
      port: 4455,
      autoConnect: false,
    },
    remoteGateway: {
      enabled: false,
      port: 42010,
    },
  },
});

const wss = new WebSocket.Server({ port: 42001 });

const logService = new LogService((logs) => {
  broadcast('log:updated', { logs });
}, 100);

const mediaEventsService = new MediaEventsService(store);
const mediaDisplayGroupService = new MediaDisplayGroupService(store);
const mediaEventsController = new MediaEventsController(logService, mediaEventsService);
const mediaLibraryService = new MediaLibraryService(store);
const obsService = new ObsService(store);

// Remote companion gateway (mobile PWA bridge). Authenticated WS on a
// separate port, optional — enabled via store config and a dev token
// pulled from the environment. Slice 1: chat read-only + moderation.
const remoteGatewayConfig = store.get('remoteGateway');
const remoteGatewayDevToken = process.env.REMOTE_GATEWAY_DEV_TOKEN ?? null;

function toGatewayProfile(extended: ExtendedTwitchUser): GatewayUserProfile {
  return {
    id: extended.user.id,
    login: extended.user.login,
    displayName: extended.user.display_name,
    profileImageUrl: extended.user.profile_image_url ?? null,
    createdAt: (extended.user as any).created_at ?? '',
    isModerator: extended.isModerator,
    isVip: extended.isVIP,
    isFollower: extended.followedAt !== null,
    followedAt: extended.followedAt,
    isBanned: extended.isBanned,
    banExpiresAt: extended.banExpiresAt ?? null,
  };
}

const remoteGatewayModeration: ModerationDeps = {
  getUserById: async (id) => toGatewayProfile(await getExtendedUser({ id })),
  getUserByLogin: async (login) => toGatewayProfile(await getExtendedUser({ login })),
  timeoutUser: async (userId, duration, reason) => {
    await timeoutUser(userId, duration, reason);
  },
  unbanUser: async (userId) => {
    await removeTimeoutOrBan(userId);
  },
  setUserRoles: async (userId, target) => {
    // The repo's updateRoles needs to know the *current* role state to
    // diff against — fetch it first, then forward the target as
    // the `update` slice. One extra Helix roundtrip is acceptable for
    // the ergonomics of a flat PATCH-style gateway API.
    const current = await getExtendedUser({ id: userId });
    await updateUserRoles(userId, {
      current: { isMod: current.isModerator, isVip: current.isVIP },
      update: target,
    });
  },
  deleteMessage: async (messageId) => {
    await deleteMessage(messageId);
  },
};

const remoteGatewayService = new RemoteGatewayService(
  {
    port: remoteGatewayConfig.port,
    authToken: remoteGatewayDevToken,
  },
  {
    getWindowCache: () => messageCache.getCurrentWindowCache(),
    subscribeWindow: (listener) => {
      messageCache.registerWindowMessageHandler(listener);
      return () => messageCache.unregisterWindowMessageHandler(listener);
    },
    moderation: remoteGatewayModeration,
  },
);

const backendLogService = new BackendLogService({
  enabled: true,
  broadcastViaWebSocket: true,
  maxBufferSize: 1000,
}, store);

const audiosessionManager = new AudiosessionManager(store, logService);
const proxy = new ProxyService();
const localeRepository = new AppLocaleRepository([
  { code: 'ru', name: 'Русский' },
  { code: 'en', name: 'English' },
], DEFAULT_LOCALE, store);

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

    case ActionTypes.ADD_VIP:
      await addVip(action.payload.userId);
      logService.log({
        message: `VIP добавлен: ${action.payload.userName || action.payload.userId}`,
        timestamp: new Date().toISOString(),
        userId: action.payload.userId,
        userName: action.payload.userName || 'unknown',
      });
      break;

    case ActionTypes.REMOVE_VIP:
      await removeVip(action.payload.userId);
      logService.log({
        message: `VIP удален: ${action.payload.userName || action.payload.userId}`,
        timestamp: new Date().toISOString(),
        userId: action.payload.userId,
        userName: action.payload.userName || 'unknown',
      });
      break;

    case ActionTypes.ADD_MOD:
      await addModerator(action.payload.userId);
      logService.log({
        message: `Модератор добавлен: ${action.payload.userName || action.payload.userId}`,
        timestamp: new Date().toISOString(),
        userId: action.payload.userId,
        userName: action.payload.userName || 'unknown',
      });
      break;

    case ActionTypes.REMOVE_MOD:
      await removeModerator(action.payload.userId);
      logService.log({
        message: `Модератор удален: ${action.payload.userName || action.payload.userId}`,
        timestamp: new Date().toISOString(),
        userId: action.payload.userId,
        userName: action.payload.userName || 'unknown',
      });
      break;

    case ActionTypes.DELETE_MESSAGE:
      if (action.payload.messageId) {
        await deleteMessage(action.payload.messageId);
        logService.logMessage(`Сообщение удалено: ${action.payload.messageId}`);
      }
      break;

    case ActionTypes.SHOUTOUT:
      try {
        await sendShoutout(action.payload.userId);
        logService.log({
          message: `Shoutout отправлен: ${action.payload.userName || action.payload.userId}`,
          timestamp: new Date().toISOString(),
          userId: action.payload.userId,
          userName: action.payload.userName || 'unknown',
        });
      } catch (error: any) {
        const errorMsg = error?.response?.data?.message || error?.message || 'Unknown error';
        logService.log({
          message: `Ошибка shoutout для ${action.payload.userName || action.payload.userId}: ${errorMsg}`,
          timestamp: new Date().toISOString(),
          userId: action.payload.userId,
          userName: action.payload.userName || 'unknown',
        });
        console.error('Shoutout error:', error?.response?.data || error?.message);
      }
      break;

    case ActionTypes.SHOW_MEDIA:
      await mediaEventsController.showMedia(action.payload);
      break;

    case ActionTypes.OBS_ACTION:
      await obsService.executeAction(action.payload.obsActionId);
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
  (user) => {
    console.log('User data fetched:', user);
    mainWindow?.webContents?.send("auth:accountUpdated", { accountInfo: user });
  },
  () => {
    console.log('Twitch client logged out');
    currentUserId = null;
    actionScheduler.stop();
    mainWindow?.webContents?.send("logout:success");
  },
  proxy  // Pass ProxyService to TwitchClient
);

// Set up broadcasting status callback for timer middleware
middlewareProcessor.setIsBroadcastingCallback(async () => {
  return await twitchClient.getIsBroadcasting();
});

const botService = new BotConfigService(
    store,
    (newConfig: BotConfig) => {
        middlewareProcessor.onThemeUpdated(newConfig);
    }
)

// Track current user ID for trigger repository access
let currentUserId: string | null = null;
let mediaOverlayDebugMode = false;

const actionScheduler = new ActionScheduler({
    getRepository: () => {
        if (!currentUserId) return null;
        return DbRepository.getInstance(currentUserId).triggers;
    },
    logService,
    sendMessage: (message: string) => twitchClient.sendMessage(message),
    obsService,
})

const chatStatsService = new ChatStatsService(broadcast, () => {
    if (!currentUserId) return null;
    return DbRepository.getInstance(currentUserId);
});

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

backendLogService.setBroadcastCallback((logs) => {
  broadcast('backend-logs:update', logs);
});

mediaEventsService.setBroadcastCallback(broadcast);
mediaDisplayGroupService.setBroadcastCallback(broadcast);
mediaEventsController.setBroadcastCallback(broadcast);
mediaLibraryService.setBroadcastCallback(broadcast);
obsService.setBroadcastCallback(broadcast);

// ─── DonationAlerts Goal Service ─────────────────────────────────
const daService = new DonationAlertsService(broadcast);
{
    const savedDaUrl = store.get('donationAlertsWidgetUrl' as any) as string | undefined;
    if (savedDaUrl) {
        daService.setWidgetUrl(savedDaUrl).catch(err => {
            console.error('❌ [DA] Failed to start:', err.message);
        });
    }
}

ipcMain.handle('da:set-widget-url', async (_e, url: string) => {
    store.set('donationAlertsWidgetUrl' as any, url);
    if (url) {
        try {
            await daService.setWidgetUrl(url);
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    } else {
        daService.stop();
        return { success: true };
    }
});

ipcMain.handle('da:get-widget-url', () => {
    return store.get('donationAlertsWidgetUrl' as any) || '';
});

ipcMain.handle('da:get-status', () => {
    return daService.getStatus();
});

twitchClient.on('event', async ({ destination, event }) => {
  if (destination === `status:${EVENT_BROADCASTING}`) {
    if (event.isOnline) {
      chatStatsService.onStreamOnline();
    } else {
      chatStatsService.onStreamOffline();
    }
  }

  if (destination === `${EVENT_CHANEL}:${EVENT_FOLLOW}`) {
    messageCache.processMessage(event);
  } else if (destination === `${EVENT_CHANEL}:${EVENT_REDEMPTION}`) {
    const result = await middlewareProcessor.processMessage(event);
    messageCache.processMessage(result);
  } else if (destination === `${EVENT_CHANEL}:${EVENT_RAID}`) {
    // Process raid through middleware (for triggers)
    await middlewareProcessor.processMessage(event);
    // Also broadcast to UI
    broadcast(destination, event);
  } else {
    broadcast(destination, event);
  }
});

twitchClient.on('chat', async (parsedMessage) => {
  chatStatsService.onChatMessage(parsedMessage);
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

  // Remote companion gateway — started whenever REMOTE_GATEWAY_DEV_TOKEN
  // is present in the environment. The store flag will gate a proper
  // UI toggle in a later slice; during dev the env var alone is the
  // opt-in. Without the env var the gateway stays off.
  if (remoteGatewayDevToken) {
    remoteGatewayService.start().catch((err) => {
      console.error('❌ Failed to start remote gateway:', err);
    });
  }

  initWindowsManager(store);
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
          currentUserId = userId;
          middlewareProcessor.onUserUpdated(userId);

          // Set roulette repository after user is authenticated
          if (userId) {
            const dbRepo = DbRepository.getInstance(userId);
            middlewareProcessor.setRouletteRepository(dbRepo.roulette);
          }

          // Start the action scheduler after user is authenticated
          actionScheduler.start();
        });
      },
      localeRepository,
      backendLogService
  );
  audiosessionManager.registerIPCs();
  scraper.setupIPCs();
  mediaEventsService.registerIpcHandlers();
  mediaDisplayGroupService.registerIpcHandlers();
  mediaLibraryService.registerIpcHandlers();
  obsService.registerIpcHandlers();

  // Auto-connect to OBS if enabled in config
  {
    const obsConfig = obsService.getConnectionConfig();
    if (obsConfig.enabled && obsConfig.autoConnect) {
      obsService.connect().catch((err) => {
        console.warn('[main] OBS auto-connect failed:', err);
      });
    }
  }

  // Docs service for help window
  const docsService = new DocsService();
  docsService.registerIpcHandlers();

  // Media test handler - needs access to mediaEventsController
  ipcMain.handle('media:test', async (_e, mediaEventId: string) => {
    const mediaEvent = mediaEventsController.getMediaEventById(mediaEventId);
    if (!mediaEvent) {
      console.log('[Media Test] Media event not found:', mediaEventId);
      return { success: false, error: 'Media event not found' };
    }

    await mediaEventsController.showMedia({
      mediaEventId,
      context: {
        user: 'TestUser',
        userId: '12345',
        reward: 'Test Reward',
        rewardCost: 100,
        target: 'TestTarget',
        args: ['arg1', 'arg2', 'arg3'],
        raider: 'TestRaider',
        viewers: 42
      }
    });

    return { success: true };
  });

  // Test media for a group (shows first available media in the group)
  ipcMain.handle('media:test-group', async (_e, groupId: string) => {
    const allEvents = mediaEventsController.getAllMediaEvents();
    const groupEvents = allEvents.filter(e => e.groupId === groupId);

    if (groupEvents.length === 0) {
      console.log('[Media Test] No media events in group:', groupId);
      return { success: false, error: 'No media events in this group' };
    }

    // Pick a random event from the group
    const randomEvent = groupEvents[Math.floor(Math.random() * groupEvents.length)];

    await mediaEventsController.showMedia({
      mediaEventId: randomEvent.id,
      context: {
        user: 'TestUser',
        userId: '12345',
        reward: 'Test Reward',
        rewardCost: 100,
        target: 'TestTarget',
        args: ['arg1', 'arg2', 'arg3'],
        raider: 'TestRaider',
        viewers: 42
      }
    });

    return { success: true, mediaName: randomEvent.name };
  });

  wss.on('connection', (ws) => {
    ws.on('message', (message) => {
      const { channel, payload } = JSON.parse(message.toString());
      switch (channel) {
        case 'theme:get-all':
          const themes = store.get('themes');
          broadcast('themes:get', { themes, currentThemeName });
          break;
        case 'media-groups:get-all':
          const groups = mediaDisplayGroupService.getAll();
          broadcast('media-groups:updated', groups);
          break;
        case 'media-overlay:set-debug':
          mediaOverlayDebugMode = payload?.enabled ?? false;
          broadcast('media-overlay:debug', { enabled: mediaOverlayDebugMode });
          break;
        case 'media-overlay:get-debug':
          broadcast('media-overlay:debug', { enabled: mediaOverlayDebugMode });
          break;
        case 'media-overlay:get-settings':
          const overlaySettings = mediaDisplayGroupService.getOverlaySettings();
          broadcast('media-overlay:settings-updated', overlaySettings);
          break;
        case 'media-overlay:save-settings':
          mediaDisplayGroupService.saveOverlaySettings(payload);
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
        case 'chat:messages-request':
            const overlayCache = messageCache.getCurrentCache();
            console.log('📦 Client requested overlay cache, sending', overlayCache.messages.length, 'messages');
            broadcast('chat:messages', overlayCache);
            break;
        case 'chat:window-messages-request':
            const windowCache = messageCache.getCurrentWindowCache();
            console.log('🪟 Client requested window cache, sending', windowCache.messages.length, 'messages');
            broadcast('chat:window-messages', windowCache);
            break;
        case 'chat-stats:get':
            broadcast('chat-stats:update', chatStatsService.getStats());
            break;
        case 'da:goal-request':
            broadcast('da:goal-update', daService.getGoalData());
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

  messageCache.registerWindowMessageHandler(({ messages, showSourceChannel }) => {
    console.log('🪟 Sending window cached messages to clients:', messages.map(msg => msg.id));
    broadcast('chat:window-messages', { messages: Array.from(messages), showSourceChannel });
  });
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  backendLogService.logCrash(error, 'UNCAUGHT_EXCEPTION');
  app.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  backendLogService.logCrash(reason, 'UNHANDLED_REJECTION');
  app.exit(1);
});
app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', async (event) => {
  event.preventDefault();
  chatStatsService.stop();
  scraper.dispose();
  twitchClient.stop()
  audiosessionManager.close();
  await obsService.shutdown();
  if (remoteGatewayService.isRunning()) {
    await remoteGatewayService.stop();
  }
  wss.clients.forEach((client) => {
    client.close();
  });
  wss.close();
  await stopAllServers();

  setTimeout(() => {
    const handles = (process as any)._getActiveHandles?.() || [];
    console.log(`Final check: ${handles.length} handles remaining`);
    handles.forEach((h: any, idx: number) => {
      const name = h?.constructor?.name || typeof h;
      let extra = '';
      // Best-effort hints for common handle types
      if (name === 'Socket' && h?.address) {
        try { extra = JSON.stringify(h.address()); } catch {}
      } else if (name === 'Timeout' && h?._idleTimeout) {
        extra = `timeout=${h._idleTimeout}`;
      } else if (name === 'Server' && h?.listening && h?.address) {
        try { extra = JSON.stringify(h.address()); } catch {}
      }
      console.log(`[handle ${idx}] ${name} ${extra}`);

      // Force-close any lingering sockets to avoid hanging the process
      if (name === 'Socket' && typeof h.destroy === 'function') {
        try { h.destroy(); } catch {}
      }
    });
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
