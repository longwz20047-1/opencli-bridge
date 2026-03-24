import { Tray, Menu, nativeImage, app, dialog } from 'electron';
import { isAutoLaunchEnabled, setAutoLaunch } from './autoLaunch';

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
  return tray;
}

export async function updateTray(
  status: 'connected' | 'disconnected' | 'partial',
  serverInfo?: string
): Promise<void> {
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

  const autoLaunch = await isAutoLaunchEnabled().catch(() => false);

  const menu = Menu.buildFromTemplate([
    {
      label: `OpenCLI Bridge v${app.getVersion()}`,
      enabled: false,
    },
    {
      label: `${icon} ${serverInfo || 'No server'}  —  ${statusText}`,
      enabled: false,
    },
    { type: 'separator' },
    { label: 'Add Server...', click: () => showPasteDialog() },
    {
      label: 'Start at Login',
      type: 'checkbox',
      checked: autoLaunch,
      click: (menuItem) => {
        setAutoLaunch(menuItem.checked).catch(() => {});
      },
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
}

export function getTray(): Tray | null {
  return tray;
}

async function showPasteDialog(): Promise<void> {
  const { clipboard } = require('electron');
  const clipText = clipboard.readText().trim();
  const hasObkContent = clipText.startsWith('obk://') || clipText.startsWith('eyJ');

  const result = await dialog.showMessageBox({
    type: 'question',
    title: 'Add Server',
    message: hasObkContent
      ? 'Found config string in clipboard. Connect to this server?'
      : 'Copy an obk:// config string to clipboard, then click "Read Clipboard".',
    detail: hasObkContent ? clipText.substring(0, 80) + '...' : undefined,
    buttons: hasObkContent ? ['Connect', 'Cancel'] : ['Read Clipboard', 'Cancel'],
    defaultId: 0,
    cancelId: 1,
  });

  if (result.response === 0) {
    const text = clipboard.readText().trim();
    const cleaned = text.replace('obk://', '');
    if (cleaned && onAddServer) {
      onAddServer(cleaned);
    }
  }
}
