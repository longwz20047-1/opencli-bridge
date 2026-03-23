import { app } from 'electron';
import { loadConfig } from './configStore';
import { createTray, updateTray } from './tray';
import { ensureTrayVisibility } from './trayFallback';
import { ConnectionManager } from './connectionManager';

let connection: ConnectionManager | null = null;

app.whenReady().then(async () => {
  // macOS: hide dock icon (tray-only app)
  if (process.platform === 'darwin') app.dock?.hide();

  const config = loadConfig();
  const tray = createTray('disconnected');
  await ensureTrayVisibility(tray);

  if (config.servers.length === 0) {
    console.log(
      'No servers configured. Edit ~/.opencli-bridge/config.json to add a server.'
    );
    updateTray('disconnected', 'No server configured');
    return;
  }

  // Phase 1: connect to first server only
  const server = config.servers[0];
  connection = new ConnectionManager(server, config, (_serverId, status) => {
    console.log(`[${server.name}] ${status}`);
    updateTray(
      status === 'connected' ? 'connected' : 'disconnected',
      server.name
    );
  });
  connection.connect();
});

app.on('window-all-closed', (e: Event) => e.preventDefault()); // Keep running as tray app
app.on('before-quit', () => {
  connection?.disconnect();
});
