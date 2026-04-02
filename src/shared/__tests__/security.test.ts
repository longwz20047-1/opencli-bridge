// src/shared/__tests__/security.test.ts
import { describe, it, expect } from 'vitest';
import { isLoopback } from '../security';

describe('isLoopback (shared/security)', () => {
  it('recognizes localhost', () => {
    expect(isLoopback('localhost')).toBe(true);
    expect(isLoopback('localhost.')).toBe(true);
  });

  it('recognizes 127.0.0.1', () => {
    expect(isLoopback('127.0.0.1')).toBe(true);
  });

  it('recognizes 127.x.x.x range', () => {
    expect(isLoopback('127.0.0.2')).toBe(true);
    expect(isLoopback('127.255.255.255')).toBe(true);
  });

  it('recognizes IPv6 loopback', () => {
    expect(isLoopback('::1')).toBe(true);
  });

  it('recognizes IPv4-mapped IPv6 loopback', () => {
    expect(isLoopback('::ffff:127.0.0.1')).toBe(true);
  });

  it('recognizes 0.0.0.0', () => {
    expect(isLoopback('0.0.0.0')).toBe(true);
  });

  it('rejects remote hostnames', () => {
    expect(isLoopback('example.com')).toBe(false);
    expect(isLoopback('192.168.1.1')).toBe(false);
    expect(isLoopback('10.0.0.1')).toBe(false);
  });
});
