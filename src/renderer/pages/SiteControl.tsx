import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SiteToggle } from '../components/SiteToggle';
import { Shield, RefreshCw, RotateCcw } from 'lucide-react';
import { getDomainForSite, DOMAIN_MAPPING } from '../../shared/domainMapping';
import { bridgeInvoke } from '../hooks/useBridge';

export default function SiteControl() {
  const { t } = useTranslation();
  const [allowedSites, setAllowedSites] = useState<string[] | 'prompt'>('prompt');
  const [availableSites, setAvailableSites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sitesConfig, scannedSites] = await Promise.all([
        bridgeInvoke<{ allowedSites: string[] | 'prompt' }>('sites:list'),
        bridgeInvoke<string[]>('sites:scan'),
      ]);
      setAllowedSites(sitesConfig.allowedSites);
      setAvailableSites(scannedSites);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const groupedSites = useMemo(() => {
    const groups: Record<string, string[]> = {};
    for (const site of availableSites) {
      const domain = getDomainForSite(site);
      if (!groups[domain]) groups[domain] = [];
      groups[domain].push(site);
    }
    for (const d of Object.keys(groups)) groups[d].sort();
    return groups;
  }, [availableSites]);

  const domainOrder = useMemo(() => {
    const known = Object.keys(DOMAIN_MAPPING);
    const present = Object.keys(groupedSites);
    const ordered = known.filter(d => present.includes(d));
    if (present.includes('other')) ordered.push('other');
    return ordered;
  }, [groupedSites]);

  const isSiteEnabled = (site: string): boolean => {
    if (allowedSites === 'prompt') return true;
    return allowedSites.includes(site);
  };

  const updateSites = async (newSites: string[] | 'prompt') => {
    setAllowedSites(newSites);
    await bridgeInvoke('sites:update', newSites);
  };

  const handleToggle = (site: string, enabled: boolean) => {
    if (allowedSites === 'prompt') {
      const all = availableSites.filter(s => s !== site || enabled);
      updateSites(all);
      return;
    }
    if (enabled) updateSites([...allowedSites, site]);
    else updateSites(allowedSites.filter(s => s !== site));
  };

  const handleRescan = async () => {
    setScanning(true);
    try {
      const scanned = await bridgeInvoke<string[]>('sites:scan');
      setAvailableSites(scanned);
    } finally { setScanning(false); }
  };

  const disableAll = () => {
    if (!confirm(t('disableAllConfirm'))) return;
    updateSites([]);
  };

  const resetToPrompt = () => updateSites('prompt');

  if (loading) return <div className="flex items-center justify-center h-full text-muted-foreground">{t('loading')}</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h1 className="text-lg font-semibold">{t('siteControl')}</h1>
          </div>
          <div className="text-sm text-muted-foreground">
            {allowedSites === 'prompt' ? t('modePrompt') : t('sitesEnabled', { count: allowedSites.length, total: availableSites.length })}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={disableAll} className="inline-flex items-center gap-1 px-3 py-1 text-xs border border-border rounded hover:bg-accent">{t('disableAll')}</button>
          <button onClick={resetToPrompt} className="inline-flex items-center gap-1 px-3 py-1 text-xs border border-border rounded hover:bg-accent">
            <RotateCcw className="h-3.5 w-3.5" /> {t('resetToPrompt')}
          </button>
          <div className="flex-1" />
          <button onClick={handleRescan} disabled={scanning} className="inline-flex items-center gap-1 px-3 py-1 text-xs border border-border rounded hover:bg-accent">
            <RefreshCw className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} /> {scanning ? t('scanning') : t('rescan')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {availableSites.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Shield className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm">{t('noSitesDetected')}</p>
            <p className="text-xs mt-1">{t('noSitesHint')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {domainOrder.map(domain => (
              <div key={domain} className="border rounded-lg p-3">
                <h3 className="text-sm font-semibold mb-2 capitalize flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />{domain}
                  <span className="text-xs text-muted-foreground font-normal">({groupedSites[domain].length})</span>
                </h3>
                <div className="space-y-0.5">
                  {groupedSites[domain].map(site => (
                    <SiteToggle key={site} site={site} enabled={isSiteEnabled(site)} onToggle={handleToggle} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
