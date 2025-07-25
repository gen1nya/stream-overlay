import path from "path";
import fs from "fs";
import { ipcMain, shell, app } from 'electron';
import * as authService from './services/authService';
import * as chatService from './services/chatService';
import * as eventSubService from './services/esService';
import * as messageParser from './services/messageParser';
import Store from 'electron-store';
import defaultTheme from './default-theme.json';
import { MiddlewareProcessor } from './services/middleware/MiddlewareProcessor';
import { createChatWindow, createPreviewWindow } from './windowsManager';
import {LogService} from "./services/logService";

export function registerIpcHandlers(
    store: Store,
    broadcast: (ch: string, payload: any) => void,
    middlewareProcessor: MiddlewareProcessor,
    appStartTime: number,
    getCurrentTheme: () => any,
    setCurrentTheme: (name: string, theme: any) => void,
    messageCache: typeof import('./services/MessageCacheManager'),
    logService: LogService,
) {
  ipcMain.handle('auth:authorize', async () => authService.authorizeIfNeeded());
  ipcMain.handle('auth:getTokens', async () => authService.getTokens());
  ipcMain.handle('auth:getAccountInfo', async () => authService.getAccountInfo());
  ipcMain.handle('auth:logout', async () => {
    await authService.clearTokens();
    eventSubService.stop();
    chatService.stopChat();
    return true;
  });
  ipcMain.handle('auth:onAccountReady', async () => {
    await chatService.startChat();
    eventSubService.start();
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
  });
  ipcMain.handle('chat:open-overlay', () => createChatWindow());
  ipcMain.handle('setting:open-preview', () => createPreviewWindow());
  ipcMain.handle('utils:open_url', async (_e, url) => { await shell.openExternal(url); });
  ipcMain.handle('system:get-stats', () => ({ startTime: appStartTime, lastEventSub: eventSubService.getLastEventTimestamp(), lastIRC: chatService.getLastEventTimestamp() }));
  ipcMain.handle('system:reconnect', async () => {
    eventSubService.stop({ setStopping: false, ignoreClose: true } as any);
    chatService.stopChat();
    eventSubService.start();
    chatService.startChat();
    return true;
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
      middlewareProcessor.onThemeUpdated(theme.bot);
      messageCache.updateSettings({
        lifetime: theme.allMessages?.lifetime ?? 60,
        maxCount: theme.allMessages?.maxCount ?? 6,
      });
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
    middlewareProcessor.onThemeUpdated(theme.bot);
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
