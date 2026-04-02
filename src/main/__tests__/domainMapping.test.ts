// src/main/__tests__/domainMapping.test.ts
import { describe, it, expect } from 'vitest';
import { DOMAIN_MAPPING, getDomainForSite } from '../domainMapping';

describe('domainMapping', () => {
  it('exports a non-empty DOMAIN_MAPPING', () => {
    expect(Object.keys(DOMAIN_MAPPING).length).toBeGreaterThan(0);
  });

  it('contains expected domains', () => {
    expect(DOMAIN_MAPPING).toHaveProperty('social');
    expect(DOMAIN_MAPPING).toHaveProperty('media');
    expect(DOMAIN_MAPPING).toHaveProperty('finance');
    expect(DOMAIN_MAPPING).toHaveProperty('news');
    expect(DOMAIN_MAPPING).toHaveProperty('desktop');
    expect(DOMAIN_MAPPING).toHaveProperty('jobs');
  });

  it('maps twitter to social domain', () => {
    expect(DOMAIN_MAPPING.social).toContain('twitter');
  });

  it('maps bilibili to media domain', () => {
    expect(DOMAIN_MAPPING.media).toContain('bilibili');
  });

  describe('getDomainForSite', () => {
    it('returns correct domain for known site', () => {
      expect(getDomainForSite('twitter')).toBe('social');
      expect(getDomainForSite('bilibili')).toBe('media');
      expect(getDomainForSite('eastmoney')).toBe('finance');
    });

    it('returns "other" for unknown site', () => {
      expect(getDomainForSite('unknown-site')).toBe('other');
    });
  });
});
