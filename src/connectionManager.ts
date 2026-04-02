import WebSocket from 'ws';
import type { ServerConfig, BridgeConfig, BridgeCommand } from './shared/types';
import { execute } from './commandRunner';
import { scanAvailableSites } from './capabilityScanner';

// Read bundled opencli version from its package.json at runtime
function getBundledOpenCliVersion(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('../node_modules/@jackwener/opencli/package.json') as { version: string };
    return pkg.version;
  } catch {
    return 'unknown';
  }
}

type StatusCallback = (
  serverId: string,
  status: 'connected' | 'disconnected' | 'connecting'
) => void;

type PairedCallback = (serverId: string, obkKey: string) => void;

export class ConnectionManager {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private backoffMs = 1000;
  private consecutiveFailures = 0;
  private wasReplaced = false;
  private onStatusChange: StatusCallback;
  private onPaired: PairedCallback;

  constructor(
    private serverConfig: ServerConfig,
    private bridgeConfig: BridgeConfig,
    onStatusChange: StatusCallback,
    onPaired: PairedCallback = () => {},
  ) {
    this.onStatusChange = onStatusChange;
    this.onPaired = onPaired;
  }

  connect(): void {
    this.wasReplaced = false;
    this.onStatusChange(this.serverConfig.id, 'connecting');

    const headers: Record<string, string> = {
      'x-bridge-id': this.bridgeConfig.bridgeId,
      'x-device-name': this.bridgeConfig.deviceName,
    };

    // Use permanent key if paired, pairing token if not
    if (this.serverConfig.paired && this.serverConfig.apiKey) {
      headers['x-bridge-key'] = this.serverConfig.apiKey;
    } else if (this.serverConfig.pairingToken) {
      headers['x-bridge-pairing-token'] = this.serverConfig.pairingToken;
    }

    const ws = new WebSocket(this.serverConfig.wsUrl, {
      headers,
      handshakeTimeout: 10000,
    });

    ws.on('open', () => {
      this.ws = ws;
      this.backoffMs = 1000;
      this.consecutiveFailures = 0;
      this.onStatusChange(this.serverConfig.id, 'connected');
      this.sendRegister().catch((err) => console.error('[WS] Register error:', err));
    });

    ws.on('message', async (data: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
        } else if (msg.type === 'command') {
          const result = await execute(msg as BridgeCommand);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(result));
          } else {
            console.warn('[WS] Connection closed during command execution, result dropped');
          }
        } else if (msg.type === 'paired') {
          // Pairing successful — server issued us a permanent key
          console.log('[WS] Pairing successful, received bridge key');
          this.onPaired(this.serverConfig.id, msg.obkKey);
        } else if (msg.type === 'device_replaced') {
          console.warn('[WS] Device replaced by another connection');
          this.wasReplaced = true;
          this.disconnect();
          return;
        } else if (msg.type === 'config_update') {
          // Server pushed domain config change — log it (domain filtering is server-side)
          console.log(`[WS] Config update received: enabledDomains=${JSON.stringify(msg.enabledDomains)}`);
        } else if (msg.type === 'diagnose') {
          // Server requests diagnostics — respond with current capabilities
          const sites = await scanAvailableSites();
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'diagnose_result',
              id: msg.id,
              opencliVersion: getBundledOpenCliVersion(),
              nodeVersion: process.versions.node,
              platform: process.platform,
              daemonRunning: sites.length > 0,
              extensionConnected: false,
              availableSites: sites,
              timestamp: Date.now(),
            }));
          }
        }
      } catch (err) {
        console.error('[WS] Message handling error:', err);
      }
    });

    ws.on('close', (code: number) => {
      this.ws = null;
      this.onStatusChange(this.serverConfig.id, 'disconnected');

      // 4001: API key revoked (permanent failure)
      // 4002: Pairing token expired (permanent failure)
      // 1000: Normal closure (user-initiated, server shutdown, or device replaced)
      // wasReplaced: Extra guard in case close code is modified by proxy
      if (code === 4001 || code === 4002 || code === 1000 || this.wasReplaced) {
        if (code === 4001) {
          console.error('[WS] API key revoked. Not reconnecting.');
        } else if (code === 4002) {
          console.error('[WS] Pairing token expired. Please generate a new one.');
        } else if (this.wasReplaced) {
          console.log('[WS] Device replaced. Not reconnecting.');
        } else {
          console.log('[WS] Connection closed normally. Not reconnecting.');
        }
        return;
      }
      
      // 1001: Going away (server restart or browser navigation)
      // 1006: Abnormal closure (network issue)
      // Other codes: Reconnect
      console.log(`[WS] Connection closed with code ${code}. Reconnecting...`);
      this.scheduleReconnect();
    });

    ws.on('error', (err: Error) => {
      console.error('[WS] Error:', err.message);
    });
  }

  private async sendRegister(): Promise<void> {
    if (!this.ws) return;
    const sites = await scanAvailableSites();
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return; // WS may have closed during scan
    this.ws.send(
      JSON.stringify({
        type: 'register',
        bridgeId: this.bridgeConfig.bridgeId,
        deviceName: this.bridgeConfig.deviceName,
        userId: this.serverConfig.userId,
        projects: this.serverConfig.projects,
        capabilities: {
          opencliVersion: getBundledOpenCliVersion(),
          nodeVersion: process.versions.node,
          platform: process.platform,
          daemonRunning: sites.length > 0,
          extensionConnected: false,
          availableSites: sites,
        },
      })
    );
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.consecutiveFailures++;

    if (this.consecutiveFailures >= 20) {
      console.warn('[WS] 20 failures. Pausing 5 minutes.');
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.consecutiveFailures = 0;
        this.connect();
      }, 300000);
      return;
    }

    const jitter = Math.random() * 1000;
    const delay = Math.min(this.backoffMs + jitter, 60000);
    this.backoffMs = Math.min(this.backoffMs * 2, 60000);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
