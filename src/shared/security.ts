// src/shared/security.ts
// isLoopback 的唯一定义。configMigration 和 securityPolicy 均从此 import。
import * as net from 'net';

/**
 * Check if a hostname is a loopback address.
 * Uses Node.js net module for robust IPv4/IPv6 handling.
 * Covers: localhost, 127.0.0.0/8, ::1, ::ffff:127.*, 0.0.0.0
 */
export function isLoopback(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === 'localhost.') return true;
  if (hostname === '0.0.0.0') return true;

  // Use net.isIPv4/isIPv6 for robust parsing
  if (net.isIPv4(hostname)) {
    return hostname.startsWith('127.');
  }

  // IPv6: ::1 and ::ffff:127.x.x.x (both dotted and hex forms)
  if (net.isIPv6(hostname) || hostname.startsWith('::')) {
    const normalized = hostname.toLowerCase();
    if (normalized === '::1') return true;
    // Full-form IPv6 normalization (e.g., 0:0:0:0:0:0:0:1 → ::1)
    try {
      const urlNormalized = new URL(`http://[${hostname}]/`).hostname;
      if (urlNormalized === '::1' || urlNormalized === '::') return true;
      if (urlNormalized.startsWith('::ffff:')) {
        const mapped = urlNormalized.slice(7);
        if (net.isIPv4(mapped)) return mapped.startsWith('127.');
      }
    } catch { /* not valid IPv6 */ }
    // IPv4-mapped IPv6: handle both ::ffff:127.0.0.1 and ::ffff:7f00:1
    if (normalized.startsWith('::ffff:')) {
      const mapped = normalized.slice(7);
      if (net.isIPv4(mapped)) return mapped.startsWith('127.');
      // Hex form: 7f00:0001 = 127.0.0.1
      try {
        const parts = mapped.split(':');
        if (parts.length === 2) {
          const high = parseInt(parts[0], 16);
          return (high >> 8) === 0x7f; // First octet is 127
        }
      } catch { /* not a valid hex form */ }
    }
  }
  return false;
}
