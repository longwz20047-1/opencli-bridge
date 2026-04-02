// src/main/__tests__/configMigration.test.ts
import { describe, it, expect } from 'vitest';
import { migrateConfig, detectUnsafeWsUrls, DEFAULT_V2_FIELDS, CURRENT_CONFIG_VERSION } from '../configMigration';
import type { BridgeConfig, ServerConfig } from '../../shared/types';

describe('configMigration', () => {
  describe('migrateConfig', () => {
    it('returns config unchanged if already at current version', () => {
      const v2Config: BridgeConfig = {
        configVersion: 2,
        bridgeId: 'b_existing',
        deviceName: 'my-pc',
        autoStart: true,
        servers: [],
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
      const result = migrateConfig(v2Config as unknown as Record<string, unknown>);
      expect(result).toEqual(v2Config);
    });

    it('migrates v1 config by adding v2 defaults without removing v1 fields', () => {
      const v1Config = {
        bridgeId: 'b_old123',
        deviceName: 'old-device',
        autoStart: false,
        servers: [
          {
            id: 'srv_1',
            name: 'Local',
            wsUrl: 'ws://localhost:4936/bridge',
            userId: 'user1',
            projects: [{ projectId: 'p1', projectName: 'Test' }],
            paired: true,
            apiKey: 'key123',
            addedAt: '2026-01-01T00:00:00Z',
          },
        ],
      };
      const result = migrateConfig(v1Config as Record<string, unknown>);

      // v1 fields preserved
      expect(result.bridgeId).toBe('b_old123');
      expect(result.deviceName).toBe('old-device');
      expect(result.autoStart).toBe(false);
      expect(result.servers).toHaveLength(1);
      expect(result.servers[0].wsUrl).toBe('ws://localhost:4936/bridge');
      expect(result.servers[0].userId).toBe('user1');
      expect(result.servers[0].projects).toHaveLength(1);
      expect(result.servers[0].paired).toBe(true);
      expect(result.servers[0].apiKey).toBe('key123');

      // v2 fields added
      expect(result.configVersion).toBe(2);
      expect(result.allowedSites).toBe('prompt');
      expect(result.closeAction).toBe('minimize');
      expect(result.commandTimeout).toBe(30);
      expect(result.theme).toBe('dark');
    });

    it('sets enforceWss to false when unsafe ws:// remote servers exist', () => {
      const v1Config = {
        bridgeId: 'b_unsafe',
        deviceName: 'pc',
        autoStart: true,
        servers: [
          {
            id: 'srv_1',
            name: 'Remote Insecure',
            wsUrl: 'ws://remote-server.com:4936/bridge',
            userId: 'u1',
            projects: [],
            paired: true,
            addedAt: '2026-01-01T00:00:00Z',
          },
        ],
      };
      const result = migrateConfig(v1Config as Record<string, unknown>);
      expect(result.enforceWss).toBe(false);
    });

    it('sets enforceWss to true when only localhost ws:// servers exist', () => {
      const v1Config = {
        bridgeId: 'b_safe',
        deviceName: 'pc',
        autoStart: true,
        servers: [
          {
            id: 'srv_1',
            name: 'Local',
            wsUrl: 'ws://localhost:4936/bridge',
            userId: 'u1',
            projects: [],
            paired: true,
            addedAt: '2026-01-01T00:00:00Z',
          },
        ],
      };
      const result = migrateConfig(v1Config as Record<string, unknown>);
      expect(result.enforceWss).toBe(true);
    });

    it('generates bridgeId if missing', () => {
      const v1Config = {
        deviceName: 'pc',
        autoStart: true,
        servers: [],
      };
      const result = migrateConfig(v1Config as Record<string, unknown>);
      expect(result.bridgeId).toBeTruthy();
      expect(typeof result.bridgeId).toBe('string');
    });
  });

  describe('detectUnsafeWsUrls', () => {
    it('returns empty array for all wss:// servers', () => {
      const servers: ServerConfig[] = [
        { id: 's1', name: 'A', wsUrl: 'wss://remote.com/ws', userId: 'u', projects: [], paired: true, addedAt: '' },
      ];
      expect(detectUnsafeWsUrls(servers)).toEqual([]);
    });

    it('returns empty array for localhost ws:// servers', () => {
      const servers: ServerConfig[] = [
        { id: 's1', name: 'Local', wsUrl: 'ws://localhost:4936/bridge', userId: 'u', projects: [], paired: true, addedAt: '' },
        { id: 's2', name: '127', wsUrl: 'ws://127.0.0.1:4936/bridge', userId: 'u', projects: [], paired: true, addedAt: '' },
      ];
      expect(detectUnsafeWsUrls(servers)).toEqual([]);
    });

    it('detects remote ws:// servers as unsafe', () => {
      const servers: ServerConfig[] = [
        { id: 's1', name: 'Safe', wsUrl: 'wss://remote.com/ws', userId: 'u', projects: [], paired: true, addedAt: '' },
        { id: 's2', name: 'Unsafe', wsUrl: 'ws://remote.com/ws', userId: 'u', projects: [], paired: true, addedAt: '' },
      ];
      const result = detectUnsafeWsUrls(servers);
      expect(result).toEqual(['Unsafe: ws://remote.com/ws']);
    });

    it('handles invalid URLs gracefully', () => {
      const servers: ServerConfig[] = [
        { id: 's1', name: 'Bad', wsUrl: 'not-a-url', userId: 'u', projects: [], paired: true, addedAt: '' },
      ];
      expect(detectUnsafeWsUrls(servers)).toEqual([]);
    });
  });
});
