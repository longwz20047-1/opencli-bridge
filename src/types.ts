export interface ServerConfig {
  id: string;
  name: string;
  wsUrl: string;
  apiKey?: string;          // obk_ key (set after pairing)
  pairingToken?: string;    // obp_ token (temporary, removed after pairing)
  userId: string;
  projects: Array<{ projectId: string; projectName: string }>;
  paired: boolean;
  addedAt: string;
}

export interface BridgeConfig {
  bridgeId: string;
  deviceName: string;
  autoStart: boolean;
  autoLaunchInitialized?: boolean;
  servers: ServerConfig[];
}

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
