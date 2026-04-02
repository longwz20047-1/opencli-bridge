// src/main/securityPolicy.ts
import { isLoopback } from '../shared/security';

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
