import path from "path";
import fs from "fs";
import { ipcMain, shell, app } from 'electron';
import * as authService from './services/twitch/authService';
import * as messageParser from './services/twitch/messageParser';
import { TwitchClient } from './services/twitch/TwitchClient';
import Store from 'electron-store';
import defaultTheme from './default-theme.json';
import { MiddlewareProcessor } from './services/middleware/MiddlewareProcessor';
import { createChatWindow, createPreviewWindow } from './windowsManager';
import {LogService} from "./services/logService";
import {
  addModerator,
  addVip,
  getExtendedUser,
  fetchUser,
  removeModerator, removeTimeoutOrBan,
  removeVip, timeoutUser
} from "./services/twitch/authorizedHelixApi";
import {updateRoles} from "./services/twitch/roleUpdater";

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
  ipcMain.handle('chat:open-overlay', () => createChatWindow());
  ipcMain.handle('setting:open-preview', () => createPreviewWindow());
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
}
