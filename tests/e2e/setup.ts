import { _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'path';

interface LaunchOptions {
  env?: Record<string, string>;
}

export async function launchApp(options?: LaunchOptions): Promise<{ app: ElectronApplication; page: Page }> {
  const app = await electron.launch({
    args: [path.join(__dirname, '../../dist/main.js')],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      ...options?.env,
    },
  });

  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  return { app, page };
}
