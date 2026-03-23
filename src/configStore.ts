import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import type { BridgeConfig } from './types';

const CONFIG_DIR = path.join(os.homedir(), '.opencli-bridge');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export function loadConfig(): BridgeConfig {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    } catch {
      // Fall through to default config
    }
  }
  // Default config
  const config: BridgeConfig = {
    bridgeId: `b_${crypto.randomBytes(8).toString('hex')}`,
    deviceName: os.hostname(),
    autoStart: false,
    servers: [],
  };
  saveConfig(config);
  return config;
}

export function saveConfig(config: BridgeConfig): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}
