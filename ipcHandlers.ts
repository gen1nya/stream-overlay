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
import { ActionTypes } from './services/middleware/ActionTypes';
import { timeoutUser } from './services/authorizedHelixApi';
import { createChatWindow, createPreviewWindow } from './windowsManager';

export function registerIpcHandlers(store: Store, broadcast: (ch: string, payload: any) => void, middlewareProcessor: MiddlewareProcessor, appStartTime: number) {
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
    messageParser.loadGlobalBadges();
    messageParser.loadChannelBadges();
    messageParser.load7tvGlobalEmotes();
    messageParser.loadBTTVGlobalEmotes();
    messageParser.loadCheerEmotes();
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
    if (themes[themeName]) {
      store.set('currentTheme', themeName);
      broadcast('theme:update', themes[themeName]);
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
    middlewareProcessor.onThemeUpdated(theme.bot);
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
