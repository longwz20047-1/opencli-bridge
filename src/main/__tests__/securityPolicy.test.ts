// src/main/__tests__/securityPolicy.test.ts
import { describe, it, expect } from 'vitest';
import { validateWsUrl } from '../securityPolicy';

describe('securityPolicy', () => {
  it('allows wss:// always', () => {
    expect(validateWsUrl('wss://remote.com/ws', true)).toEqual({ valid: true });
    expect(validateWsUrl('wss://remote.com/ws', false)).toEqual({ valid: true });
  });

  it('allows ws://localhost when enforceWss is true', () => {
    expect(validateWsUrl('ws://localhost:4936/bridge', true)).toEqual({ valid: true });
    expect(validateWsUrl('ws://127.0.0.1:4936/bridge', true)).toEqual({ valid: true });
  });

  it('blocks remote ws:// when enforceWss is true', () => {
    const result = validateWsUrl('ws://remote.com:4936/bridge', true);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('ws://');
  });

  it('allows remote ws:// when enforceWss is false', () => {
    expect(validateWsUrl('ws://remote.com:4936/bridge', false)).toEqual({ valid: true });
  });

  it('rejects non-ws protocols', () => {
    const result = validateWsUrl('http://example.com', true);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('protocol');
  });

  it('rejects invalid URLs', () => {
    const result = validateWsUrl('not-a-url', true);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Invalid');
  });

  it('rejects empty string', () => {
    const result = validateWsUrl('', true);
    expect(result.valid).toBe(false);
  });
});
