import path from "path";
import fs from "fs";
import { ipcMain, shell, app } from 'electron';
import * as authService from './services/twitch/authService';
import * as messageParser from './services/twitch/messageParser';
import { TwitchClient } from './services/twitch/TwitchClient';
import Store from 'electron-store';
import defaultTheme from './default-theme.json';
import { MiddlewareProcessor } from './services/middleware/MiddlewareProcessor';
import {createChatWindow, createPreviewWindow, createTerminalWindow, createBackendLogsWindow, createMediaOverlayEditorWindow, createMediaOverlayWindow, closeMediaOverlayWindow, isMediaOverlayWindowOpen, setChatGameMode, getChatGameMode, createHelpWindow} from './windowsManager';
import {BackendLogService} from './services/BackendLogService';
import {LogService} from "./services/logService";
import {
  addModerator,
  addVip,
  getExtendedUser,
  fetchUser,
  removeModerator, removeTimeoutOrBan,
  removeVip, timeoutUser, deleteMessage
} from "./services/twitch/authorizedHelixApi";
import {updateRoles} from "./services/twitch/roleUpdater";
import {AppLocaleRepository} from "./services/locale/AppLocaleRepository";
import {DbRepository} from "./services/db/DbRepository";

export function registerIpcHandlers(
    store: Store,
    broadcast: (ch: string, payload: any) => void,
    middlewareProcessor: MiddlewareProcessor,
    appStartTime: number,
    getCurrentTheme: () => any,
    setCurrentTheme: (name: string, theme: any) => void,
    messageCache: typeof import('./services/MessageCacheManager'),
    logService: LogService,
    twitchClient: TwitchClient,
    onAccountReady: () => void,
    localeRepository: AppLocaleRepository,
    backendLogService?: BackendLogService,
) {
  ipcMain.handle('user:getById', async ( event, args) => {
    return await getExtendedUser({ id: args.userId });
  });
  ipcMain.handle('user:getByLogin', async ( event, args) => {
    return await getExtendedUser({ login: args.login });
  });
  ipcMain.handle('user:updateRoles', async (event, args) => {
    const { userId, roles } = args;
    return await updateRoles(userId, roles);
  })
  ipcMain.handle('user:mute', async (event, args) => {
    const { userId, reason, duration  } = args;
    return await timeoutUser(userId, duration, reason);
  });
  ipcMain.handle('user:unban', async (event, args) => {
      return await removeTimeoutOrBan(args.userId)
  });
  ipcMain.handle('message:delete', async (event, args) => {
    const { messageId } = args;
    return await deleteMessage(messageId);
  });
  ipcMain.handle('auth:authorize', async () => authService.authorizeIfNeeded());
  ipcMain.handle('auth:getTokens', async () => authService.getTokens());
  ipcMain.handle('auth:logout', async () => {
    await authService.clearTokens();
    await twitchClient.logout();
    return true;
  });
  ipcMain.handle('auth:onAccountReady', async () => {
    await twitchClient.start();
    Promise.allSettled([
      messageParser.loadGlobalBadges(logService),
      messageParser.loadChannelBadges(logService),
      messageParser.load7tvGlobalEmotes(logService),
      messageParser.loadBTTVGlobalEmotes(logService),
      messageParser.loadCheerEmotes(logService)
    ]).then((results) => {
      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          console.warn(`❌ Ошибка при загрузке [${i}]:`, result.reason);
        }
      });
    });
    onAccountReady();
  });

  ipcMain.handle('locale:list', async () => {
    return localeRepository.getAvailableLocales();
  });

  ipcMain.handle('locale:get', async () => {
    return localeRepository.getCurrentLocale();
  });

  ipcMain.handle('locale:set', async (_e, localeCode: string) => {
    const newLocale = localeRepository.setCurrentLocale(localeCode);
    broadcast('locale:changed', { locale: newLocale });
    return newLocale;
  });

  ipcMain.handle('arg:create-terminal', async (_e, userId?: string) => createTerminalWindow());
  ipcMain.handle('chat:open-overlay', () => createChatWindow());
  ipcMain.handle('chat:set-game-mode', (_e, enabled: boolean) => setChatGameMode(enabled));
  ipcMain.handle('chat:get-game-mode', () => getChatGameMode());
  ipcMain.handle('setting:open-preview', () => createPreviewWindow());

  // Media overlay handlers
  ipcMain.handle('media:open-overlay', () => createMediaOverlayWindow());
  ipcMain.handle('media:close-overlay', () => closeMediaOverlayWindow());
  ipcMain.handle('media:is-overlay-open', () => isMediaOverlayWindowOpen());

  // Help window handler
  ipcMain.handle('help:open', () => createHelpWindow());
  ipcMain.handle('utils:open_url', async (_e, url) => { await shell.openExternal(url); });
  ipcMain.handle('system:get-stats', () => ({ startTime: appStartTime, lastEventSub: twitchClient.getLastEventSubTimestamp(), lastIRC: twitchClient.getLastChatTimestamp() }));
  ipcMain.handle('system:reconnect', async () => {
    await twitchClient.restart();
    return true;
  });
  ipcMain.handle("themes:get-all", async (_e) => {
    const themes = store.get('themes') as any;
    return { themes, currentThemeName: store.get('currentTheme') };
  });
  ipcMain.handle('theme:create', async (_e, newThemeName) => {
    const themes = store.get('themes') as any;
    themes[newThemeName] = defaultTheme;
    store.set('themes', themes);
    broadcast('themes:get', { themes, currentThemeName: store.get('currentTheme') });
  });
  ipcMain.handle('theme:set', async (_e, themeName) => {
    const themes = store.get('themes') as any;
    console.log('Setting theme:', themeName, "stored themes names:", themes ? Object.keys(themes) : 'none');
    const theme = themes[themeName];
    if (theme) {
      setCurrentTheme(themeName, theme);
      store.set('currentTheme', themeName);
      messageCache.updateSettings({
        lifetime: theme.allMessages?.lifetime ?? 60,
        maxCount: theme.allMessages?.maxCount ?? 6,
      });
      broadcast('theme:update-by-name', { name: themeName, theme: theme });
      broadcast('theme:update', theme);
      broadcast('themes:get', { themes, currentThemeName: themeName });
    }
  });
  ipcMain.handle('theme:import', async (_e, { name, theme }) => {
    const themes = store.get('themes') as any;
    themes[name] = theme;
    store.set('themes', themes);
    broadcast('themes:get', { themes, currentThemeName: store.get('currentTheme') });
  });
  ipcMain.handle('theme:delete', async (_e, name) => {
    const themes = store.get('themes') as any;
    if (themes[name]) {
      delete themes[name];
      store.set('themes', themes);
      broadcast('themes:get', { themes, currentThemeName: store.get('currentTheme') });
    }
  });
  ipcMain.on('theme:update', (_e, theme, name) => {
    const themes = store.get('themes') as any;
    themes[name] = theme;
    store.set('themes', themes);
    messageCache.updateSettings({
      lifetime: theme.allMessages?.lifetime ?? 60,
      maxCount: theme.allMessages?.maxCount ?? 6,
    });
    setCurrentTheme(name, theme);
    broadcast('theme:update', theme);
  });
  ipcMain.handle('utils:save_image_buffer', async (_e, fileName, buffer) => {
    const saveDir = path.join(app.getPath('userData'), 'images');
    await fs.promises.mkdir(saveDir, { recursive: true });
    const fullPath = path.join(saveDir, fileName);
    await fs.promises.writeFile(fullPath, Buffer.from(buffer));
    return `file://${fullPath}`;
  });
  ipcMain.handle('utils:get_image_url', (_e, fileName) => `/images/${encodeURIComponent(fileName)}`);

  // Media overlay editor handler
  ipcMain.handle('media-overlay:open-editor', () => createMediaOverlayEditorWindow());

  // Backend logs handlers
  ipcMain.handle('backend-logs:open', () => createBackendLogsWindow());
  ipcMain.handle('backend-logs:get-buffer', () => {
    return backendLogService ? backendLogService.getBuffer() : [];
  });
  ipcMain.handle('backend-logs:clear', () => {
    if (backendLogService) {
      backendLogService.clearBuffer();
    }
  });
  ipcMain.handle('backend-logs:get-config', () => {
    return backendLogService ? backendLogService.getConfig() : null;
  });
  ipcMain.handle('backend-logs:update-config', (_e, config) => {
    if (backendLogService) {
      backendLogService.updateConfig(config);
      return backendLogService.getConfig();
    }
    return null;
  });

  // ============================================
  // Trigger System IPC Handlers
  // ============================================

  // Helper to get trigger repository
  const getTriggerRepository = () => {
    const userId = twitchClient.getUserId();
    if (!userId) return null;
    return DbRepository.getInstance(userId).triggers;
  };

  // Get all pending scheduled actions
  ipcMain.handle('triggers:get-scheduled', async () => {
    const repo = getTriggerRepository();
    if (!repo) return [];
    return repo.getAllPendingActions();
  });

  // Get active VIPs (with scheduled removal)
  ipcMain.handle('triggers:get-active-vips', async () => {
    const repo = getTriggerRepository();
    if (!repo) return [];
    return repo.getActiveVips();
  });

  // Get active moderators (with scheduled removal)
  ipcMain.handle('triggers:get-active-mods', async () => {
    const repo = getTriggerRepository();
    if (!repo) return [];
    return repo.getActiveMods();
  });

  // Cancel a specific scheduled action
  ipcMain.handle('triggers:cancel-action', async (_e, actionId: number, reason?: string) => {
    const repo = getTriggerRepository();
    if (!repo) return false;
    repo.cancelAction(actionId, reason);
    return true;
  });

  // Cancel all scheduled actions for a user
  ipcMain.handle('triggers:cancel-for-user', async (_e, userId: string, actionType?: string, reason?: string) => {
    const repo = getTriggerRepository();
    if (!repo) return 0;
    if (actionType) {
      return repo.cancelByUserAndType(userId, actionType, reason);
    }
    // Cancel all types for this user
    const vipCancelled = repo.cancelByUserAndType(userId, 'remove_vip', reason);
    const modCancelled = repo.cancelByUserAndType(userId, 'remove_mod', reason);
    return vipCancelled + modCancelled;
  });

  // Get execution history
  ipcMain.handle('triggers:get-executions', async (_e, options?: { limit?: number; triggerId?: string; offset?: number }) => {
    const repo = getTriggerRepository();
    if (!repo) return [];
    return repo.getExecutions(options);
  });

  // Get scheduled actions for a specific user
  ipcMain.handle('triggers:get-user-scheduled', async (_e, userId: string) => {
    const repo = getTriggerRepository();
    if (!repo) return [];
    return repo.getScheduledActionsForUser(userId);
  });

  // ============================================
  // Roulette Stats Handlers
  // ============================================

  // Helper to get roulette repository
  const getRouletteRepository = () => {
    const userId = twitchClient.getUserId();
    if (!userId) return null;
    return DbRepository.getInstance(userId).roulette;
  };

  // Get roulette plays history
  ipcMain.handle('roulette:get-plays', async (_e, options?: { userId?: string; limit?: number; offset?: number }) => {
    const repo = getRouletteRepository();
    if (!repo) return [];
    return repo.getPlays(options);
  });

  // Get roulette stats for a specific user
  ipcMain.handle('roulette:get-stats', async (_e, userId: string) => {
    const repo = getRouletteRepository();
    if (!repo) return null;
    return repo.getStats(userId);
  });

  // Get all roulette stats
  ipcMain.handle('roulette:get-all-stats', async (_e, options?: { limit?: number; offset?: number; orderBy?: 'plays' | 'survival_rate' | 'death_rate' }) => {
    const repo = getRouletteRepository();
    if (!repo) return [];
    return repo.getAllStats(options);
  });

  // Get global roulette stats
  ipcMain.handle('roulette:get-global-stats', async () => {
    const repo = getRouletteRepository();
    if (!repo) return { totalPlays: 0, totalSurvivals: 0, totalDeaths: 0, uniquePlayers: 0 };
    return repo.getGlobalStats();
  });

  // Get roulette leaderboard
  ipcMain.handle('roulette:get-leaderboard', async (_e, type: 'survivors' | 'deaths' | 'plays', limit?: number) => {
    const repo = getRouletteRepository();
    if (!repo) return [];
    return repo.getLeaderboard(type, limit || 10);
  });

  // Get total play count
  ipcMain.handle('roulette:get-play-count', async () => {
    const repo = getRouletteRepository();
    if (!repo) return 0;
    return repo.getPlayCount();
  });

  // Clear all roulette data
  ipcMain.handle('roulette:clear-all', async () => {
    const repo = getRouletteRepository();
    if (!repo) return false;
    repo.clearAllData();
    return true;
  });
}
