import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp } from './setup';

test.describe('App Launch', () => {
  let app: ElectronApplication;
  let page: Page;

  test.afterEach(async () => {
    if (app) await app.close();
  });

  test('window opens with correct title', async () => {
    ({ app, page } = await launchApp());
    const title = await page.title();
    expect(title).toBe('OpenCLI Bridge');
  });

  test('window has minimum size constraints', async () => {
    ({ app, page } = await launchApp());
    const size = page.viewportSize();
    expect(size!.width).toBeGreaterThanOrEqual(800);
    expect(size!.height).toBeGreaterThanOrEqual(500);
  });

  test('sidebar navigation is visible', async () => {
    ({ app, page } = await launchApp());
    const nav = page.locator('nav[role="navigation"]');
    await expect(nav).toBeVisible();
  });

  test('app name is correct', async () => {
    ({ app } = await launchApp());
    const name = await app.evaluate(async ({ app: electronApp }) => {
      return electronApp.getName();
    });
    expect(name).toBeTruthy();
  });
});
