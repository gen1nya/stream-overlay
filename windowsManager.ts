import { BrowserWindow, app } from 'electron';

export let mainWindow: BrowserWindow | null = null;
export let chatWindow: BrowserWindow | null = null;
export let previewWindow: BrowserWindow | null = null;

export function createMainWindow(url: string): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  mainWindow.loadURL(url);
}

export function createChatWindow(): void {
  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.focus();
    return;
  }
  chatWindow = new BrowserWindow({
    width: 400,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  chatWindow.loadURL('http://localhost:5173/chat-overlay');
}

export function createPreviewWindow(): void {
  previewWindow = new BrowserWindow({
    width: 450,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  previewWindow.loadURL('http://localhost:5173/preview');
}
