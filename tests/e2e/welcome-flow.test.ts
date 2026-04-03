import { test, expect } from '@playwright/test';
import { launchApp } from './setup';
import fs from 'fs';
import path from 'path';
import os from 'os';

test.describe('Welcome Flow', () => {
  let testConfigDir: string;

  test.beforeAll(() => {
    testConfigDir = path.join(os.tmpdir(), `opencli-bridge-test-${Date.now()}`);
    fs.mkdirSync(testConfigDir, { recursive: true });
  });

  test.afterAll(() => {
    fs.rmSync(testConfigDir, { recursive: true, force: true });
  });

  test.beforeEach(() => {
    fs.writeFileSync(path.join(testConfigDir, 'config.json'), JSON.stringify({
      configVersion: 2,
      bridgeId: 'b_test',
      deviceName: 'test',
      autoStart: false,
      servers: [],
      enforceWss: true,
      allowedSites: 'prompt',
      closeAction: 'minimize',
      commandTimeout: 30,
      maxHistoryRecords: 2000,
      autoUpdate: false,
      updateChannel: 'stable',
      logLevel: 'info',
      theme: 'dark',
      locale: 'zh-CN',
    }));
  });

  test('shows welcome guide when no servers', async () => {
    const { app, page } = await launchApp({
      env: { OPENCLI_BRIDGE_CONFIG_DIR: testConfigDir },
    });

    const welcome = page.locator('text=Welcome to OpenCLI Bridge');
    await expect(welcome).toBeVisible({ timeout: 5000 });

    await app.close();
  });

  test('welcome guide has paste input and connect button', async () => {
    const { app, page } = await launchApp({
      env: { OPENCLI_BRIDGE_CONFIG_DIR: testConfigDir },
    });

    const input = page.locator('input[placeholder*="config"]');
    await expect(input).toBeVisible();

    const connectBtn = page.locator('button', { hasText: 'Connect' });
    await expect(connectBtn).toBeVisible();

    await app.close();
  });

  test('migrates v1 config to v2 on startup', async () => {
    // Write v1 config (no configVersion, no v2 fields)
    fs.writeFileSync(path.join(testConfigDir, 'config.json'), JSON.stringify({
      bridgeId: 'b_test_v1',
      deviceName: 'test',
      autoStart: false,
      servers: [],
    }));

    const { app } = await launchApp({ env: { OPENCLI_BRIDGE_CONFIG_DIR: testConfigDir } });

    await new Promise(r => setTimeout(r, 2000));

    const migrated = JSON.parse(fs.readFileSync(path.join(testConfigDir, 'config.json'), 'utf-8'));
    expect(migrated.configVersion).toBe(2);
    expect(migrated.enforceWss).toBe(true);
    expect(migrated.allowedSites).toBe('prompt');
    expect(migrated.theme).toBe('dark');

    await app.close();
  });
});
