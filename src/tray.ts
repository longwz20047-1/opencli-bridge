import { Tray, Menu, nativeImage, app, BrowserWindow, ipcMain } from 'electron';

let tray: Tray | null = null;
let onAddServer: ((configString: string) => void) | null = null;

export function setOnAddServer(callback: (configString: string) => void): void {
  onAddServer = callback;
}

export function createTray(
  _status: 'connected' | 'disconnected' | 'partial'
): Tray {
  tray = new Tray(nativeImage.createEmpty());
  updateTray(_status);

  // Handle paste-config IPC from Add Server dialog
  ipcMain.on('paste-config', (_event, configString: string) => {
    if (onAddServer && configString) {
      const cleaned = configString.replace('obk://', '').trim();
      onAddServer(cleaned);
    }
    BrowserWindow.getAllWindows()
      .filter(w => w.getTitle() === 'Add Server')
      .forEach(w => w.close());
  });

  return tray;
}

export function updateTray(
  status: 'connected' | 'disconnected' | 'partial',
  serverInfo?: string
): void {
  if (!tray) return;

  const statusText =
    status === 'connected'
      ? 'Connected'
      : status === 'partial'
        ? 'Partial'
        : 'Disconnected';
  const icon =
    status === 'connected' ? '●' : status === 'partial' ? '◐' : '○';

  tray.setToolTip(`OpenCLI Bridge - ${statusText}`);

  const menu = Menu.buildFromTemplate([
    {
      label: `${icon} ${serverInfo || 'No server'}  —  ${statusText}`,
      enabled: false,
    },
    { type: 'separator' },
    { label: 'Add Server...', click: () => showPasteDialog() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
}

export function getTray(): Tray | null {
  return tray;
}

function showPasteDialog(): void {
  const win = new BrowserWindow({
    width: 500, height: 200, title: 'Add Server',
    resizable: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  win.loadURL(`data:text/html,
    <body style="font:14px sans-serif;padding:16px;background:#1a1a2e;color:#eee">
      <h3 style="margin-top:0">Paste Config String</h3>
      <textarea id="input" style="width:100%;height:60px;background:#2a2a4e;color:#eee;border:1px solid #444;border-radius:4px;padding:8px;box-sizing:border-box" placeholder="Paste obk:// config string here..."></textarea>
      <button onclick="require('electron').ipcRenderer.send('paste-config', document.getElementById('input').value)" style="margin-top:8px;padding:8px 16px;background:#4a9eff;color:white;border:none;border-radius:4px;cursor:pointer">Connect</button>
    </body>
  `);
}
