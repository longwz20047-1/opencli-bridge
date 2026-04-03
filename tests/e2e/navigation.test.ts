import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp } from './setup';

test.describe('Navigation', () => {
  let app: ElectronApplication;
  let page: Page;

  test.afterEach(async () => {
    if (app) await app.close();
  });

  test('can navigate to all pages via sidebar', async () => {
    ({ app, page } = await launchApp());

    // Use button elements in nav — index-based to avoid i18n text matching
    const navButtons = page.locator('nav[role="navigation"] button');
    const count = await navButtons.count();
    expect(count).toBeGreaterThanOrEqual(6);

    for (let i = 0; i < count; i++) {
      await navButtons.nth(i).click();
      const heading = page.locator('h1, h2').first();
      await expect(heading).toBeVisible({ timeout: 3000 });
    }
  });
});
