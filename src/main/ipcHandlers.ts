// src/main/ipcHandlers.ts
import { ipcMain, BrowserWindow } from 'electron';
import { IPC } from '../shared/ipcChannels';
import { loadConfig, saveConfig, addServer, removeServer } from '../configStore';
import type { ConnectionManager } from '../connectionManager';

/**
 * Register all IPC invoke handlers.
 * Called once during app.whenReady().
 */
export function registerIpcHandlers(
  getConnections: () => Map<string, ConnectionManager>,
): void {
  // Server management
  ipcMain.handle(IPC.SERVERS_LIST, () => {
    const config = loadConfig();
    return config.servers;
  });

  ipcMain.handle(IPC.SERVERS_ADD, (_event, configString: string) => {
    const config = loadConfig();
    const server = addServer(config, configString);
    return server;
  });

  ipcMain.handle(IPC.SERVERS_REMOVE, (_event, serverId: string) => {
    const config = loadConfig();
    const conn = getConnections().get(serverId);
    if (conn) {
      conn.disconnect();
      getConnections().delete(serverId);
    }
    removeServer(config, serverId);
  });

  ipcMain.handle(IPC.SERVERS_RECONNECT, (_event, serverId: string) => {
    const conn = getConnections().get(serverId);
    if (conn) {
      conn.disconnect();
      conn.connect();
    }
  });

  // Settings
  ipcMain.handle(IPC.SETTINGS_GET, () => {
    const config = loadConfig();
    const { servers, ...settings } = config;
    return settings;
  });

  ipcMain.handle(IPC.SETTINGS_UPDATE, (_event, updates: Record<string, unknown>) => {
    const config = loadConfig();
    Object.assign(config, updates);
    saveConfig(config);
    return config;
  });
}

/**
 * Set up event listeners that forward connectionManager events to the renderer via IPC.
 */
export function forwardConnectionEvents(
  mainWindow: BrowserWindow,
  conn: ConnectionManager,
): void {
  conn.on('status', (serverId, status) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC.SERVER_STATUS, { serverId, status });
    }
  });

  conn.on('paired', (serverId, obkKey) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC.SERVER_PAIRED, { serverId, obkKey });
    }
  });

  conn.on('command:start', (serverId, cmd) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC.COMMAND_RECEIVED, { serverId, ...cmd });
    }
  });

  conn.on('command:complete', (serverId, cmd, result) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC.COMMAND_COMPLETED, { serverId, ...cmd, ...result });
    }
  });
}
