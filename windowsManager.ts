import { BrowserWindow, app, screen } from 'electron';
import path from "path";
import Store from 'electron-store';
import { StoreSchema, ChatWindowConfig } from './services/store/StoreSchema';

/**
 * Check if a point is visible on any connected display
 */
function isPositionVisible(x: number, y: number, width: number, height: number): boolean {
  const displays = screen.getAllDisplays();
  // Check if at least part of the window (top-left corner area) is visible on any display
  for (const display of displays) {
    const { x: dx, y: dy, width: dw, height: dh } = display.bounds;
    // Window is visible if its top-left corner + some margin is within display bounds
    const margin = 50; // At least 50px should be visible
    if (x >= dx - width + margin && x < dx + dw - margin &&
        y >= dy && y < dy + dh - margin) {
      return true;
    }
  }
  return false;
}

export let mainWindow: BrowserWindow | null = null;
export let chatWindow: BrowserWindow | null = null;
export let previewWindow: BrowserWindow | null = null;
export let terminalWindow: BrowserWindow | null = null;
export let backendLogsWindow: BrowserWindow | null = null;
export let mediaOverlayEditorWindow: BrowserWindow | null = null;
export let mediaOverlayWindow: BrowserWindow | null = null;

// Store reference for persisting settings
let store: Store<StoreSchema> | null = null;

// Game mode state for chat window
let isGameModeEnabled = false;

/**
 * Initialize windowsManager with store reference
 */
export function initWindowsManager(storeInstance: Store<StoreSchema>): void {
  store = storeInstance;
  // Load saved game mode state
  const chatWindowConfig = store.get('chatWindow');
  if (chatWindowConfig) {
    isGameModeEnabled = chatWindowConfig.gameMode ?? false;
  }
}

export function createTerminalWindow(): void {
    terminalWindow = new BrowserWindow({
        width: 800,
        height: 600,
        title: 'NEPTUNE INTELLIGENZA TERMINAL',
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
          devTools: false,
        },
        icon: path.join(__dirname, 'assets', 'icon.png'),
    });
    terminalWindow.setTitle("NEPTUNE INTELLIGENZA TERMINAL")
    terminalWindow.setMenuBarVisibility(false);
    terminalWindow.loadURL('http://localhost:5173/tty');
}

/**
 * Close all child windows (chat, preview, terminal, backend logs)
 */
function closeAllChildWindows(): void {
  const windows = [chatWindow, previewWindow, terminalWindow, backendLogsWindow, mediaOverlayEditorWindow, mediaOverlayWindow];
  for (const win of windows) {
    if (win && !win.isDestroyed()) {
      win.close();
    }
  }
}

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
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL(url);

  // Close all child windows when main window is closed
  mainWindow.on('closed', () => {
    closeAllChildWindows();
    mainWindow = null;
  });
}

export function createChatWindow(): void {
  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.focus();
    return;
  }

  // Load saved window config
  const savedConfig = store?.get('chatWindow') ?? { width: 400, height: 640, gameMode: false };

  // Validate saved position - only use if visible on current displays
  let usePosition = false;
  if (savedConfig.x !== undefined && savedConfig.y !== undefined) {
    usePosition = isPositionVisible(savedConfig.x, savedConfig.y, savedConfig.width, savedConfig.height);
  }

  chatWindow = new BrowserWindow({
    width: savedConfig.width,
    height: savedConfig.height,
    ...(usePosition && { x: savedConfig.x, y: savedConfig.y }),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    titleBarStyle: 'hidden',
    frame: false,
    thickFrame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: true
  });

  chatWindow.setMenuBarVisibility(false);
  chatWindow.setTitle('');
  chatWindow.loadURL('http://localhost:5173/chat-overlay?mode=window');

  // Apply saved game mode state after window is ready
  chatWindow.webContents.on('did-finish-load', () => {
    if (isGameModeEnabled && chatWindow && !chatWindow.isDestroyed()) {
      chatWindow.setIgnoreMouseEvents(true, { forward: true });
      chatWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  });

  // Save position and size on move/resize
  const saveWindowBounds = () => {
    if (chatWindow && !chatWindow.isDestroyed() && store) {
      const bounds = chatWindow.getBounds();
      const currentConfig = store.get('chatWindow');
      store.set('chatWindow', {
        ...currentConfig,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      });
    }
  };

  chatWindow.on('moved', saveWindowBounds);
  chatWindow.on('resized', saveWindowBounds);

  chatWindow.on('closed', () => {
    chatWindow = null;
  });
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

export function createBackendLogsWindow(): void {
  if (backendLogsWindow && !backendLogsWindow.isDestroyed()) {
    backendLogsWindow.focus();
    return;
  }
  backendLogsWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    title: 'Backend Logs',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
  });
  backendLogsWindow.setMenuBarVisibility(false);
  backendLogsWindow.loadURL('http://localhost:5173/backend-logs');

  backendLogsWindow.on('closed', () => {
    backendLogsWindow = null;
  });
}

/**
 * Toggle game mode for chat window
 * In game mode:
 * - Window is click-through (mouse events pass through)
 * - Window stays on top of fullscreen apps (screen-saver level)
 * State is persisted and will be applied when window is opened
 */
export function setChatGameMode(enabled: boolean): boolean {
  isGameModeEnabled = enabled;

  // Persist game mode state (even if window is not open)
  if (store) {
    const currentConfig = store.get('chatWindow');
    store.set('chatWindow', {
      ...currentConfig,
      gameMode: enabled,
    });
  }

  // Apply to window if it exists
  if (chatWindow && !chatWindow.isDestroyed()) {
    if (enabled) {
      chatWindow.setIgnoreMouseEvents(true, { forward: true });
      chatWindow.setAlwaysOnTop(true, 'screen-saver');
    } else {
      chatWindow.setIgnoreMouseEvents(false);
      chatWindow.setAlwaysOnTop(true, 'normal');
    }

    // Notify renderer about game mode change
    chatWindow.webContents.send('chat:game-mode-changed', enabled);
  }

  return true;
}

/**
 * Get current game mode state
 */
export function getChatGameMode(): boolean {
  return isGameModeEnabled;
}

/**
 * Create or focus the Media Overlay Editor window
 */
export function createMediaOverlayEditorWindow(): void {
  if (mediaOverlayEditorWindow && !mediaOverlayEditorWindow.isDestroyed()) {
    mediaOverlayEditorWindow.focus();
    return;
  }

  mediaOverlayEditorWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'Media Overlay Editor',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
  });

  mediaOverlayEditorWindow.setMenuBarVisibility(false);
  mediaOverlayEditorWindow.loadURL('http://localhost:5173/media-overlay-editor');

  mediaOverlayEditorWindow.on('closed', () => {
    mediaOverlayEditorWindow = null;
  });
}

/**
 * Create or focus the Media Overlay window (for displaying media events)
 * This is a transparent, always-on-top, click-through window
 */
export function createMediaOverlayWindow(): void {
  if (mediaOverlayWindow && !mediaOverlayWindow.isDestroyed()) {
    mediaOverlayWindow.focus();
    return;
  }

  // Get primary display size for fullscreen
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mediaOverlayWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    titleBarStyle: 'hidden',
    frame: false,
    thickFrame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
  });

  mediaOverlayWindow.setMenuBarVisibility(false);
  mediaOverlayWindow.setIgnoreMouseEvents(true, { forward: true });
  mediaOverlayWindow.setAlwaysOnTop(true, 'screen-saver');
  mediaOverlayWindow.loadURL('http://localhost:5173/media-overlay');

  mediaOverlayWindow.on('closed', () => {
    mediaOverlayWindow = null;
  });
}

/**
 * Close the media overlay window
 */
export function closeMediaOverlayWindow(): void {
  if (mediaOverlayWindow && !mediaOverlayWindow.isDestroyed()) {
    mediaOverlayWindow.close();
    mediaOverlayWindow = null;
  }
}

/**
 * Check if media overlay window is open
 */
export function isMediaOverlayWindowOpen(): boolean {
  return mediaOverlayWindow !== null && !mediaOverlayWindow.isDestroyed();
}