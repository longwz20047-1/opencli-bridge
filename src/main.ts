import { app } from 'electron';
import { loadConfig, addServer, markPaired, saveConfig } from './configStore';
import { createTray, updateTray, setOnAddServer } from './tray';
import { ensureTrayVisibility } from './trayFallback';
import { setupProtocolHandler } from './protocolHandler';
import { ConnectionManager } from './connectionManager';
import { setupAutoUpdater } from './autoUpdater';
import { setAutoLaunch } from './autoLaunch';
import type { BridgeConfig } from './types';

const connections = new Map<string, ConnectionManager>();
let config: BridgeConfig;

function startConnection(serverId: string): void {
  const server = config.servers.find(s => s.id === serverId);
  if (!server) return;

  // Disconnect existing connection for this server
  connections.get(serverId)?.disconnect();

  const conn = new ConnectionManager(
    server, config,
    (_sid, status) => {
      console.log(`[${server.name}] ${status}`);
      updateTray(
        status === 'connected' ? 'connected' : 'disconnected',
        server.name
      );
    },
    (sid, obkKey) => {
      // Pairing callback: store key, reconnect with permanent auth
      markPaired(config, sid, obkKey);
      console.log(`[${server.name}] Paired successfully, reconnecting...`);
      startConnection(sid);
    }
  );

  connections.set(serverId, conn);
  conn.connect();
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

app.whenReady().then(async () => {
  if (process.platform === 'darwin') app.dock?.hide();

  // Production features
  setupAutoUpdater();

  config = loadConfig();

  // Enable auto-launch on first run only (skip in dev)
  if (app.isPackaged && !config.autoLaunchInitialized) {
    setAutoLaunch(true).catch(() => {});
    config.autoLaunchInitialized = true;
    saveConfig(config);
  }
  const tray = createTray('disconnected');
  await ensureTrayVisibility(tray);

  // Set up protocol handler (obk:// links)
  setupProtocolHandler(handleNewServer);

  // Set up tray "Add Server..." handler
  setOnAddServer(handleNewServer);

  if (config.servers.length === 0) {
    console.log('No servers configured. Use "Add Server..." in tray menu or paste a config string.');
    updateTray('disconnected', 'No server configured');
    return;
  }

  // Connect to all configured servers
  for (const server of config.servers) {
    startConnection(server.id);
  }
});

app.on('window-all-closed', (e: Event) => e.preventDefault());
app.on('before-quit', () => {
  for (const conn of connections.values()) {
    conn.disconnect();
  }
});
