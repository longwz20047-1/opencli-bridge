// src/main/ipcHandlers.ts
import { ipcMain, BrowserWindow } from 'electron';
import * as path from 'path';
import * as os from 'os';
import { IPC } from '../shared/ipcChannels';
import { loadConfig, saveConfig, addServer, removeServer } from '../configStore';
import type { ConnectionManager } from '../connectionManager';
import { LocalHistory } from './localHistory';
import { scanAvailableSites } from '../capabilityScanner';
import { setAutoLaunch } from '../autoLaunch';

// Use config-driven maxRecords (C5 fix)
function createLocalHistory(): LocalHistory {
  const config = loadConfig();
  return new LocalHistory(
    path.join(process.env.OPENCLI_BRIDGE_CONFIG_DIR || path.join(os.homedir(), '.opencli-bridge'), 'history.json'),
    config.maxHistoryRecords || 2000,
  );
}

const localHistory = createLocalHistory();

// Settings whitelist (C9 fix)
const ALLOWED_SETTINGS_KEYS = [
  'autoStart', 'autoUpdate', 'enforceWss', 'closeAction',
  'commandTimeout', 'maxHistoryRecords', 'theme', 'locale',
  'logLevel', 'updateChannel', 'allowedSites',
];

/** Wrap IPC handler with try/catch (C7 fix) */
function safeHandle(channel: string, handler: (...args: any[]) => any): void {
  ipcMain.handle(channel, async (...args) => {
    try {
      return await handler(...args);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[IPC] ${channel} error:`, msg);
      throw new Error(msg);
    }
  });
}

/**
 * Register all IPC invoke handlers.
 */
export function registerIpcHandlers(
  getConnections: () => Map<string, ConnectionManager>,
  onServerAdded?: (serverId: string) => void,
): void {
  // Server management
  safeHandle(IPC.SERVERS_LIST, () => {
    const config = loadConfig();
    const conns = getConnections();
    return config.servers.map(s => ({
      ...s,
      status: conns.get(s.id)?.isConnected ? 'connected' : 'disconnected',
    }));
  });

  safeHandle(IPC.SERVERS_ADD, (_event, configString: string) => {
    const config = loadConfig();
    const server = addServer(config, configString);
    // Start WebSocket connection immediately (P1 #1 fix)
    onServerAdded?.(server.id);
    return server;
  });

  safeHandle(IPC.SERVERS_REMOVE, (_event, serverId: string) => {
    const config = loadConfig();
    const conn = getConnections().get(serverId);
    if (conn) {
      conn.disconnect();
      getConnections().delete(serverId);
    }
    removeServer(config, serverId);
  });

  safeHandle(IPC.SERVERS_RECONNECT, (_event, serverId: string) => {
    const conn = getConnections().get(serverId);
    if (conn) {
      conn.disconnect();
    }
    // Always go through connectAndForward to reload config and create fresh connection
    onServerAdded?.(serverId);
  });

  // Settings (C9: whitelist allowed keys)
  safeHandle(IPC.SETTINGS_GET, () => {
    const config = loadConfig();
    const { servers, ...settings } = config;
    return settings;
  });

  safeHandle(IPC.SETTINGS_UPDATE, async (_event, updates: Record<string, unknown>) => {
    const config = loadConfig();
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([k]) => ALLOWED_SETTINGS_KEYS.includes(k))
    );
    Object.assign(config, filtered);
    saveConfig(config);

    // Side effects for settings that need runtime action (P1 #3 fix)
    if ('autoStart' in filtered) {
      setAutoLaunch(!!filtered.autoStart).catch(err =>
        console.error('[Settings] Failed to update auto-launch:', err)
      );
    }

    return config;
  });

  // History
  safeHandle(IPC.HISTORY_LIST, () => localHistory.list());
  safeHandle(IPC.HISTORY_CLEAR, () => localHistory.clear());
  safeHandle(IPC.HISTORY_STATS, () => localHistory.stats());
  safeHandle(IPC.HISTORY_DETAIL, (_event, id: string) => {
    return localHistory.list().then(records => records.find(r => r.id === id));
  });

  // Sites
  safeHandle(IPC.SITES_LIST, () => {
    return { allowedSites: loadConfig().allowedSites };
  });
  safeHandle(IPC.SITES_UPDATE, (_event, sites: string[] | 'prompt') => {
    const config = loadConfig();
    config.allowedSites = sites;
    saveConfig(config);
  });
  safeHandle(IPC.SITES_SCAN, () => scanAvailableSites());

  // Stub handlers for channels defined but not yet implemented (C4 fix)
  safeHandle(IPC.COMMAND_TEST, () => { throw new Error('Not implemented: command:test'); });
  safeHandle(IPC.DIAG_RUN, () => { throw new Error('Not implemented: diag:run'); });
  safeHandle(IPC.DIAG_CONNECTIVITY, () => { throw new Error('Not implemented: diag:connectivity'); });
  safeHandle(IPC.UPDATE_CHECK, () => { throw new Error('Not implemented: update:check'); });
  safeHandle(IPC.UPDATE_INSTALL, () => { throw new Error('Not implemented: update:install'); });
}

/**
 * Hook history recording into command completion events.
 */
export function setupHistoryRecording(conn: ConnectionManager): void {
  conn.on('command:complete', (serverId, cmd, result) => {
    const server = loadConfig().servers.find(s => s.id === serverId);
    localHistory.record({
      id: cmd.id,
      serverId,
      serverName: server?.name || 'Unknown',
      site: cmd.site,
      action: cmd.action,
      args: cmd.args,
      success: result.success,
      status: result.exitCode === 124 ? 'timeout' : result.success ? 'success' : 'error',
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      durationMs: result.durationMs,
      startedAt: new Date(Date.now() - result.durationMs).toISOString(),
      completedAt: new Date().toISOString(),
    }).catch(err => console.error('[History] Failed to record:', err));
  });
}

/**
 * Forward connectionManager events to renderer via IPC.
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
