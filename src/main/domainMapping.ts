// src/main/domainMapping.ts
//
// Domain → site mapping, synced from AgentStudio backend constants.ts.
// Last synced: @jackwener/opencli@1.5.8 (2026-04-02)
//
// Update procedure:
// 1. Run: opencli list -f json
// 2. Compare output with DOMAIN_MAPPING entries
// 3. Add new sites to appropriate domain, or create new domain
// 4. Update "Last synced" comment above

export const DOMAIN_MAPPING: Record<string, string[]> = {
  social: ['twitter', 'instagram', 'weibo', 'xiaohongshu'],
  media: ['bilibili', 'youtube', 'douyin', 'kuaishou'],
  finance: ['eastmoney', 'xueqiu', 'tiger'],
  news: ['google', 'baidu', 'bing', 'toutiao'],
  desktop: ['screenshot', 'clipboard', 'file', 'browser'],
  jobs: ['boss', 'lagou', 'zhipin'],
};

/**
 * Get the domain category for a site name.
 * Returns 'other' if the site is not in any known domain.
 */
export function getDomainForSite(site: string): string {
  for (const [domain, sites] of Object.entries(DOMAIN_MAPPING)) {
    if (sites.includes(site)) return domain;
  }
  return 'other';
}
