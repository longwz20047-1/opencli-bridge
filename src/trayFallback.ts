import { Tray, BrowserWindow } from 'electron';

export async function ensureTrayVisibility(tray: Tray): Promise<void> {
  if (process.platform !== 'linux') return;

  await new Promise((r) => setTimeout(r, 800));
  const bounds = tray.getBounds();
  if (bounds.width > 0 && bounds.height > 0) return;

  console.warn(
    '[Tray] System tray not supported on this Linux DE, falling back to mini-window'
  );
  const win = new BrowserWindow({
    width: 250,
    height: 80,
    alwaysOnTop: true,
    frame: false,
    resizable: false,
    webPreferences: { nodeIntegration: false },
  });
  win.loadURL(
    'data:text/html,<body style="font:14px sans-serif;padding:12px;background:#1a1a2e;color:#eee">OpenCLI Bridge: Running</body>'
  );
}
