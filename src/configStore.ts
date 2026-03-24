import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import type { BridgeConfig, ServerConfig } from './types';

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

export function addServer(config: BridgeConfig, configString: string): ServerConfig {
  const json = JSON.parse(Buffer.from(configString, 'base64url').toString());
  if (json.v !== 1) throw new Error('Unsupported config version');

  const server: ServerConfig = {
    id: `srv_${crypto.randomBytes(4).toString('hex')}`,
    name: json.n || 'Unknown Server',
    wsUrl: json.s,
    pairingToken: json.t,
    userId: json.u,
    projects: [{ projectId: json.p, projectName: json.n }],
    paired: false,
    addedAt: new Date().toISOString(),
  };

  config.servers.push(server);
  saveConfig(config);
  return server;
}

export function markPaired(config: BridgeConfig, serverId: string, obkKey: string): void {
  const server = config.servers.find(s => s.id === serverId);
  if (!server) return;
  server.apiKey = obkKey;
  server.pairingToken = undefined;
  server.paired = true;
  saveConfig(config);
}

export function removeServer(config: BridgeConfig, serverId: string): void {
  config.servers = config.servers.filter(s => s.id !== serverId);
  saveConfig(config);
}
