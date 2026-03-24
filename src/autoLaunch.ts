import AutoLaunch from 'auto-launch';
import { app } from 'electron';

let autoLauncher: AutoLaunch | null = null;

function getAutoLauncher(): AutoLaunch {
  if (!autoLauncher) {
    autoLauncher = new AutoLaunch({
      name: 'OpenCLI Bridge',
      // On macOS, omit path to let auto-launch detect the .app bundle correctly
      // app.getPath('exe') returns the inner binary path which doesn't work
      ...(process.platform !== 'darwin' ? { path: app.getPath('exe') } : {}),
      isHidden: true,
    });
  }
  return autoLauncher;
}

export async function isAutoLaunchEnabled(): Promise<boolean> {
  try {
    return await getAutoLauncher().isEnabled();
  } catch {
    return false;
  }
}

export async function setAutoLaunch(enabled: boolean): Promise<void> {
  const launcher = getAutoLauncher();
  const current = await launcher.isEnabled();
  if (enabled && !current) {
    await launcher.enable();
    console.log('[AutoLaunch] Enabled');
  } else if (!enabled && current) {
    await launcher.disable();
    console.log('[AutoLaunch] Disabled');
  }
}
