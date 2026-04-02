// src/main/securityPolicy.ts
import { isLoopback } from '../shared/security';
import { session } from 'electron';

/**
 * Validate a WebSocket URL against the WSS enforcement policy.
 *
 * When enforceWss=true:
 * - wss:// always allowed
 * - ws:// only allowed for loopback addresses
 * - ws:// to remote hosts blocked
 *
 * When enforceWss=false:
 * - Both ws:// and wss:// allowed
 */
export function validateWsUrl(
  url: string,
  enforceWss: boolean,
): { valid: boolean; reason?: string } {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
      return { valid: false, reason: 'Invalid protocol, must be ws:// or wss://' };
    }
    if (enforceWss && parsed.protocol === 'ws:') {
      if (!isLoopback(parsed.hostname)) {
        return {
          valid: false,
          reason:
            'Non-local ws:// connections are blocked. Use wss:// or disable "Force WSS" in settings.',
        };
      }
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }
}

/**
 * Set Content Security Policy headers for the renderer process.
 *
 * SECURITY NOTE:
 * - Dev mode: allows 'unsafe-inline' scripts + ws://localhost:* for HMR.
 *   This is ONLY active when !app.isPackaged. Production builds never hit this path.
 * - Prod mode: strict CSP — no inline scripts, no external WebSocket.
 */
export function setupCSP(isDev: boolean): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const csp = isDev
      ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws://localhost:*; img-src 'self' data:"
      : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:";

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    });
  });
}
