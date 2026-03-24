import { autoUpdater } from 'electron-updater';
import { app } from 'electron';

export function setupAutoUpdater(): void {
  if (!app.isPackaged) {
    console.log('[AutoUpdater] Skipping in dev mode');
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log(`[AutoUpdater] Update available: v${info.version}`);
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[AutoUpdater] Up to date');
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log(`[AutoUpdater] Downloading: ${Math.round(progress.percent)}%`);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log(`[AutoUpdater] Update downloaded: v${info.version}. Will install on quit.`);
  });

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] Error:', err.message);
  });

  // Check every 4 hours
  autoUpdater.checkForUpdates().catch(() => {});
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 4 * 60 * 60 * 1000);
}
