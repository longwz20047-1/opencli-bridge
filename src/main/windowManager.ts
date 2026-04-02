// src/main/windowManager.ts
import { BrowserWindow, app, shell, screen } from 'electron';
import * as path from 'path';
import type { BridgeConfig } from '../shared/types';
import { getRestoredBounds } from './windowBoundsStore';
import { saveConfig } from '../configStore';

let mainWindow: BrowserWindow | null = null;

export function createWindow(config: BridgeConfig): BrowserWindow {
  const displays = screen.getAllDisplays();
  const bounds = getRestoredBounds(config.windowBounds, displays);

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 800,
    minHeight: 500,
    show: false,
    frame: true,
    titleBarStyle: 'default',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // __dirname at runtime = dist/main/
      // ../preload/preload.js resolves to dist/preload/preload.js
      preload: path.join(__dirname, '../preload/preload.js'),
      webviewTag: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      allowRunningInsecureContent: false,
    },
  });

  // Block external navigation
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Debounced window bounds saving (300ms)
  let boundsTimer: NodeJS.Timeout | null = null;
  const saveBounds = () => {
    if (boundsTimer) clearTimeout(boundsTimer);
    boundsTimer = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        config.windowBounds = mainWindow.getBounds();
        saveConfig(config);
      }
    }, 300);
  };
  mainWindow.on('resize', saveBounds);
  mainWindow.on('move', saveBounds);

  // Close = hide to tray (not quit)
  mainWindow.on('close', (event) => {
    if (!(app as any).isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('ready-to-show', () => mainWindow?.show());

  return mainWindow;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function showAndFocus(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
}

// before-quit and window-all-closed are needed on ALL platforms
export function setupAppLifecycle(): void {
  app.on('before-quit', () => {
    (app as any).isQuitting = true;
  });

  app.on('window-all-closed', () => {
    // Don't quit — tray keeps running on all platforms
  });
}

// macOS-specific dock behavior
export function setupMacOSDock(): void {
  app.on('activate', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });

  // Hide dock icon — tray app only
  app.dock?.hide();
}
