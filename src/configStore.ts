import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { execSync } from 'child_process';
import type { BridgeConfig, ServerConfig } from './shared/types';
import { migrateConfig } from './main/configMigration';
import { validateWsUrl } from './main/securityPolicy';

const CONFIG_DIR = process.env.OPENCLI_BRIDGE_CONFIG_DIR || path.join(os.homedir(), '.opencli-bridge');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export function loadConfig(): BridgeConfig {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      const config = migrateConfig(raw);
      // If migration changed the config, persist it
      if (!raw.configVersion || raw.configVersion < 2) {
        saveConfig(config);
      }
      return config;
    } catch {
      // Fall through to default config
    }
  }
  const config: BridgeConfig = {
    configVersion: 2,
    bridgeId: `b_${crypto.randomBytes(8).toString('hex')}`,
    deviceName: os.hostname(),
    autoStart: true,
    servers: [],
    enforceWss: true,
    allowedSites: 'prompt' as const,
    closeAction: 'minimize',
    commandTimeout: 30,
    maxHistoryRecords: 2000,
    autoUpdate: true,
    updateChannel: 'stable',
    logLevel: 'info',
    theme: 'dark',
    locale: 'zh-CN',
  };
  saveConfig(config);
  return config;
}

export function saveConfig(config: BridgeConfig): void {
  try {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

    // Cross-platform file permissions
    if (process.platform === 'win32') {
      try {
        const user = process.env.USERNAME || process.env.USER || '';
        if (user) {
          execSync(`icacls "${CONFIG_FILE}" /inheritance:r /grant:r "${user}:(F)"`);
        }
      } catch (err) {
        console.warn('[Config] Failed to set Windows ACL:', err);
      }
    } else {
      try {
        fs.chmodSync(CONFIG_FILE, 0o600);
      } catch (err) {
        console.warn('[Config] Failed to chmod:', err);
      }
    }
  } catch (err) {
    console.error('Failed to save config:', err);
    throw new Error(`Failed to save config: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function addServer(config: BridgeConfig, configString: string): ServerConfig {
  const json = JSON.parse(Buffer.from(configString, 'base64url').toString());
  if (json.v !== 1) throw new Error('Unsupported config version');

  // Validate WSS before adding
  const validation = validateWsUrl(json.s, config.enforceWss);
  if (!validation.valid) {
    throw new Error(`Cannot add server: ${validation.reason}`);
  }

  // Check for duplicate server (same wsUrl + userId)
  const existing = config.servers.find(s => s.wsUrl === json.s && s.userId === json.u);
  if (existing) {
    existing.pairingToken = json.t;
    existing.paired = false;
    existing.apiKey = undefined;
    const hasProject = existing.projects.some(p => p.projectId === json.p);
    if (!hasProject) {
      existing.projects.push({ projectId: json.p, projectName: json.n });
    }
    saveConfig(config);
    return existing;
  }

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
