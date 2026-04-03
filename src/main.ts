import { app } from 'electron';
import * as path from 'path';
import { loadConfig, addServer, markPaired, saveConfig } from './configStore';
import { createTray, updateTray, setOnAddServer } from './tray';
import type { ServerStatus } from './tray';
import { ensureTrayVisibility } from './trayFallback';
import { setupProtocolHandler } from './protocolHandler';
import { ConnectionManager } from './connectionManager';
import { setupAutoUpdater } from './autoUpdater';
import { setAutoLaunch } from './autoLaunch';
import type { BridgeConfig } from './shared/types';
import { createWindow, setupAppLifecycle, setupMacOSDock, showAndFocus } from './main/windowManager';
import { registerIpcHandlers, forwardConnectionEvents, setupHistoryRecording } from './main/ipcHandlers';
import { setupCSP } from './main/securityPolicy';

// Single-instance lock: required for Windows protocol handler (obk://).
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

const connections = new Map<string, ConnectionManager>();
const serverStatusMap = new Map<string, ServerStatus>();
let config: BridgeConfig;

function getStatusList(): ServerStatus[] {
  return [...serverStatusMap.values()];
}

function startConnection(serverId: string): ConnectionManager | undefined {
  const server = config.servers.find(s => s.id === serverId);
  if (!server) return undefined;

  connections.get(serverId)?.disconnect();

  serverStatusMap.set(serverId, {
    name: server.name,
    status: 'connecting',
    projectCount: server.projects.length,
  });
  updateTray(getStatusList()).catch(() => {});

  const conn = new ConnectionManager(server, config);

  conn.on('status', (sid, status) => {
    console.log(`[${server.name}] ${status}`);
    serverStatusMap.set(sid, {
      name: server.name,
      status: status === 'connected' ? 'connected' : 'disconnected',
      projectCount: server.projects.length,
    });
    updateTray(getStatusList()).catch(() => {});
  });

  conn.on('paired', (sid, obkKey) => {
    markPaired(config, sid, obkKey);
    console.log(`[${server.name}] Paired successfully, reconnecting...`);
    startConnection(sid);
  });

  conn.on('device:replaced', (sid) => {
    console.warn(`[${server.name}] Device replaced, removing from connections`);
    connections.delete(sid);
    serverStatusMap.delete(sid);
    updateTray(getStatusList()).catch(() => {});
  });

  connections.set(serverId, conn);
  conn.connect();
  return conn;
}

function handleNewServer(configString: string): void {
  try {
    const server = addServer(config, configString);
    console.log(`[Main] Added server: ${server.name}`);
    startConnection(server.id);
  } catch (err) {
    console.error('[Main] Invalid config string:', err);
  }
}

// Lifecycle: before-quit + window-all-closed (all platforms)
setupAppLifecycle();

app.whenReady().then(async () => {
  // Security: CSP headers
  const isDev = !app.isPackaged;
  setupCSP(isDev);

  // macOS dock behavior
  if (process.platform === 'darwin') {
    setupMacOSDock();
  }

  // Production features
  setupAutoUpdater();

  config = loadConfig();

  // Auto-launch on first run (skip in dev)
  if (app.isPackaged && !config.autoLaunchInitialized) {
    setAutoLaunch(true).catch(() => {});
    config.autoLaunchInitialized = true;
    saveConfig(config);
  }

  // Window (createWindow handles URL loading internally)
  const mainWindow = createWindow(config);

  // IPC handlers
  registerIpcHandlers(() => connections);

  // Tray
  const tray = createTray([]);
  await ensureTrayVisibility(tray);

  // Protocol handler (obk:// links) — owns all URL routing including second-instance
  setupProtocolHandler(handleNewServer);
  setOnAddServer(handleNewServer);

  // Second instance: only show window (URL routing handled by protocolHandler)
  app.on('second-instance', () => {
    showAndFocus();
  });

  // Connect to all configured servers
  for (const server of config.servers) {
    const conn = startConnection(server.id);
    if (conn) {
      forwardConnectionEvents(mainWindow, conn);
      setupHistoryRecording(conn);
    }
  }

  // Show window if no servers (first-time experience)
  if (config.servers.length === 0) {
    showAndFocus();
  }
});

// Disconnect all on quit
app.on('before-quit', () => {
  for (const conn of connections.values()) {
    conn.disconnect();
  }
});
