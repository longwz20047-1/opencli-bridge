import WebSocket from 'ws';
import type { ServerConfig, BridgeConfig, BridgeCommand } from './types';
import { execute } from './commandRunner';
import { scanAvailableSites } from './capabilityScanner';

type StatusCallback = (
  serverId: string,
  status: 'connected' | 'disconnected' | 'connecting'
) => void;

export class ConnectionManager {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private backoffMs = 1000;
  private consecutiveFailures = 0;
  private onStatusChange: StatusCallback;

  constructor(
    private serverConfig: ServerConfig,
    private bridgeConfig: BridgeConfig,
    onStatusChange: StatusCallback
  ) {
    this.onStatusChange = onStatusChange;
  }

  connect(): void {
    this.onStatusChange(this.serverConfig.id, 'connecting');

    const ws = new WebSocket(this.serverConfig.wsUrl, {
      headers: {
        'x-bridge-key': this.serverConfig.apiKey,
        'x-bridge-id': this.bridgeConfig.bridgeId,
        'x-device-name': this.bridgeConfig.deviceName,
      },
      handshakeTimeout: 10000,
    });

    ws.on('open', () => {
      this.ws = ws;
      this.backoffMs = 1000;
      this.consecutiveFailures = 0;
      this.onStatusChange(this.serverConfig.id, 'connected');
      this.sendRegister();
    });

    ws.on('message', async (data: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
        } else if (msg.type === 'command') {
          const result = await execute(msg as BridgeCommand);
          ws.send(JSON.stringify(result));
        } else if (msg.type === 'device_replaced') {
          console.warn(
            `[WS] Device replaced by ${msg.replacedBy} for project ${msg.projectId}`
          );
        }
      } catch (err) {
        console.error('[WS] Message handling error:', err);
      }
    });

    ws.on('close', (code: number) => {
      this.ws = null;
      this.onStatusChange(this.serverConfig.id, 'disconnected');
      if (code === 4001) {
        console.error('[WS] API key revoked. Not reconnecting.');
        return;
      }
      this.scheduleReconnect();
    });

    ws.on('error', (err: Error) => {
      console.error('[WS] Error:', err.message);
    });
  }

  private sendRegister(): void {
    if (!this.ws) return;
    const sites = scanAvailableSites();
    this.ws.send(
      JSON.stringify({
        type: 'register',
        bridgeId: this.bridgeConfig.bridgeId,
        deviceName: this.bridgeConfig.deviceName,
        userId: this.serverConfig.userId,
        projects: this.serverConfig.projects,
        capabilities: {
          opencliVersion: '1.3.1',
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
