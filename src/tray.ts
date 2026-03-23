import { Tray, Menu, nativeImage, app } from 'electron';

let tray: Tray | null = null;

export function createTray(
  _status: 'connected' | 'disconnected' | 'partial'
): Tray {
  // Use a simple empty icon approach for Phase 1 (no custom icons yet)
  tray = new Tray(nativeImage.createEmpty());
  updateTray(_status);
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
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
}

export function getTray(): Tray | null {
  return tray;
}
