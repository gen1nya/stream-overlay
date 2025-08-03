import { BrowserWindow, app } from 'electron';
import path from "path";

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
    icon: path.join(__dirname, 'assets', 'icon.png'),
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
    icon: path.join(__dirname, 'assets', 'icon.png'),
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
    icon: path.join(__dirname, 'assets', 'icon.png'),
  });
  previewWindow.loadURL('http://localhost:5173/preview');
}
