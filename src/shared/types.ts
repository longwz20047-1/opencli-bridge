// src/shared/types.ts

// === Server Configuration (v1 fields preserved, v2 fields added) ===

export interface ServerConfig {
  // v1 preserved fields (DO NOT rename or remove)
  id: string;
  name: string;
  wsUrl: string;
  apiKey?: string;
  pairingToken?: string;
  userId: string;
  projects: Array<{ projectId: string; projectName: string }>;
  paired: boolean;
  addedAt: string;

  // v2 new fields
  lastConnectedAt?: string;
  errorCount?: number;
}

// === Bridge Configuration (v1 fields preserved, v2 fields added) ===

export interface BridgeConfig {
  configVersion: number;

  // v1 preserved fields (DO NOT rename or remove)
  bridgeId: string;
  deviceName: string;
  autoStart: boolean;
  autoLaunchInitialized?: boolean;
  servers: ServerConfig[];

  // v2 security
  enforceWss: boolean;
  allowedSites: string[] | 'prompt';

  // v2 behavior
  closeAction: 'minimize' | 'quit';
  commandTimeout: number;
  maxHistoryRecords: number;

  // v2 update
  autoUpdate: boolean;
  updateChannel: 'stable' | 'beta';

  // v2 logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';

  // v2 appearance
  theme: 'dark' | 'light' | 'system';
  locale: 'zh-CN' | 'en-US';

  // v2 window state
  windowBounds?: { x: number; y: number; width: number; height: number };
}

// === Command Protocol (unchanged from v1) ===

export interface BridgeCommand {
  type: 'command';
  id: string;
  site: string;
  action: string;
  args: string[];
  timeout?: number;
}

export interface BridgeResult {
  type: 'result';
  id: string;
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}
