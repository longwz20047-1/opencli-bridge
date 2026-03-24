import { app } from 'electron';

let onConfigString: ((configString: string) => void) | null = null;

export function setupProtocolHandler(callback: (configString: string) => void): void {
  onConfigString = callback;

  // Register protocol (best-effort, may fail on Linux)
  if ((process as any).defaultApp) {
    app.setAsDefaultProtocolClient('obk', process.execPath, [__dirname]);
  } else {
    app.setAsDefaultProtocolClient('obk');
  }

  // macOS: open-url event
  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleProtocolUrl(url);
  });

  // Windows: second-instance with protocol URL in argv
  app.on('second-instance', (_event, argv) => {
    const obkUrl = argv.find(a => a.startsWith('obk://'));
    if (obkUrl) handleProtocolUrl(obkUrl);
  });
}

function handleProtocolUrl(url: string): void {
  const configString = url.replace('obk://', '').replace(/\/$/, '');
  if (configString && onConfigString) {
    console.log('[Protocol] Received obk:// config string');
    onConfigString(configString);
  }
}
