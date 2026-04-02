// src/main/configMigration.ts
import * as crypto from 'crypto';
import * as os from 'os';
import type { BridgeConfig, ServerConfig } from '../shared/types';
import { isLoopback } from '../shared/security';

export const CURRENT_CONFIG_VERSION = 2;

export const DEFAULT_V2_FIELDS: Partial<BridgeConfig> = {
  configVersion: 2,
  enforceWss: true,
  allowedSites: 'prompt',
  closeAction: 'minimize',
  commandTimeout: 30,
  maxHistoryRecords: 2000,
  autoUpdate: true,
  updateChannel: 'stable',
  logLevel: 'info',
  theme: 'dark',
  locale: 'zh-CN',
};

/**
 * Detect remote servers using insecure ws:// (non-localhost).
 * Used during migration to decide whether to enable enforceWss.
 */
export function detectUnsafeWsUrls(servers: ServerConfig[]): string[] {
  return servers
    .filter((s) => {
      try {
        const parsed = new URL(s.wsUrl);
        return parsed.protocol === 'ws:' && !isLoopback(parsed.hostname);
      } catch {
        return false;
      }
    })
    .map((s) => `${s.name}: ${s.wsUrl}`);
}

/**
 * Migrate config from v1 to v2.
 * Rules: only ADD fields, never rename or delete.
 * If existing remote ws:// servers found, enforceWss defaults to false.
 */
export function migrateConfig(raw: Record<string, unknown>): BridgeConfig {
  const version = (raw.configVersion as number) || 1;

  if (version >= CURRENT_CONFIG_VERSION) {
    return raw as unknown as BridgeConfig;
  }

  const servers = (raw.servers as ServerConfig[]) || [];
  const unsafeUrls = detectUnsafeWsUrls(servers);

  if (unsafeUrls.length > 0) {
    console.warn(
      `[Migration] Found ${unsafeUrls.length} non-WSS remote server(s), enforceWss set to false:`,
      unsafeUrls,
    );
  }

  return {
    ...DEFAULT_V2_FIELDS,
    ...raw,
    configVersion: CURRENT_CONFIG_VERSION,
    enforceWss: unsafeUrls.length === 0,
    bridgeId: (raw.bridgeId as string) || crypto.randomUUID(),
    deviceName: (raw.deviceName as string) || os.hostname(),
  } as BridgeConfig;
}
