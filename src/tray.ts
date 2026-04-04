import { Tray, Menu, nativeImage, app, dialog, clipboard } from 'electron';
import path from 'path';

export interface ServerStatus {
  name: string;
  status: 'connected' | 'disconnected' | 'connecting';
  projectCount: number;
}

let tray: Tray | null = null;
let onAddServer: ((configString: string) => void) | null = null;

type NativeImageLike = { isEmpty(): boolean };
type AddServerDialogContent = {
  hasObkContent: boolean;
  message: string;
  detail?: string;
  buttons: [string, string];
};

export function selectTrayIconCandidate<T extends NativeImageLike>(
  assetDir: string,
  createImage: (iconPath: string) => T
): T | null {
  for (const fileName of ['tray-icon.png', 'icon.png']) {
    try {
      const iconPath = path.join(assetDir, fileName);
      const img = createImage(iconPath);
      if (!img.isEmpty()) return img;
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

function loadTrayIcon(): Electron.NativeImage {
  const assetDir = path.join(__dirname, '..', 'assets');
  return (
    selectTrayIconCandidate(assetDir, (iconPath) => nativeImage.createFromPath(iconPath)) ??
    nativeImage.createEmpty()
  );
}

/** Aggregate status across all servers for the tray icon. */
function aggregateStatus(servers: ServerStatus[]): 'connected' | 'partial' | 'disconnected' {
  if (servers.length === 0) return 'disconnected';
  const connected = servers.filter(s => s.status === 'connected').length;
  if (connected === servers.length) return 'connected';
  if (connected > 0) return 'partial';
  return 'disconnected';
}

export function setOnAddServer(callback: (configString: string) => void): void {
  onAddServer = callback;
}

export function getAddServerDialogContent(clipText: string): AddServerDialogContent {
  const hasObkContent = clipText.startsWith('obk://') || clipText.startsWith('eyJ');

  return {
    hasObkContent,
    message: hasObkContent
      ? '检测到剪贴板中已有配置串，是否连接这个服务器？'
      : '请先复制 obk:// 配置串到剪贴板，然后点击“读取剪贴板”。',
    detail: hasObkContent ? clipText.substring(0, 80) + '...' : undefined,
    buttons: hasObkContent ? ['连接', '取消'] : ['读取剪贴板', '取消'],
  };
}

export function createTray(servers: ServerStatus[]): Tray {
  tray = new Tray(loadTrayIcon());
  updateTray(servers);
  return tray;
}

export async function updateTray(servers: ServerStatus[]): Promise<void> {
  if (!tray) return;

  const agg = aggregateStatus(servers);
  const aggIcon = agg === 'connected' ? '●' : agg === 'partial' ? '◐' : '○';
  const aggText = agg === 'connected' ? '已连接' : agg === 'partial' ? '部分连接' : '已断开';

  tray.setToolTip(`OpenCLI Bridge — ${aggText}`);

  // Per-server status entries
  const statusLabel = { connected: '已连接', connecting: '连接中', disconnected: '已断开' };
  const serverItems: Electron.MenuItemConstructorOptions[] = servers.length > 0
    ? servers.map(s => {
        const icon = s.status === 'connected' ? '●' : s.status === 'connecting' ? '◌' : '○';
        return {
          label: `  ${icon} ${s.name} — ${statusLabel[s.status]}`,
          enabled: false,
        };
      })
    : [{ label: '  ○ 未配置服务器', enabled: false }];

  const menu = Menu.buildFromTemplate([
    {
      label: `${aggIcon} OpenCLI Bridge v${app.getVersion()}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: '显示窗口',
      click: () => {
        // Dynamic import to avoid circular dependency
        const { showAndFocus } = require('./main/windowManager');
        showAndFocus();
      },
    },
    { type: 'separator' },
    ...serverItems,
    { type: 'separator' },
    { label: '添加服务器...', click: () => showPasteDialog() },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        (app as any).isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(menu);
}

export function getTray(): Tray | null {
  return tray;
}

async function showPasteDialog(): Promise<void> {
  const clipText = clipboard.readText().trim();
  const dialogContent = getAddServerDialogContent(clipText);

  const result = await dialog.showMessageBox({
    type: 'question',
    title: '添加服务器',
    message: dialogContent.message,
    detail: dialogContent.detail,
    buttons: dialogContent.buttons,
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
