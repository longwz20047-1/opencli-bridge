import { useEffect, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Server, Terminal, Globe } from 'lucide-react';
import { useServerStore } from '../stores/useServerStore';
import { useBridgeEvent, bridgeInvoke } from '../hooks/useBridge';
import { StatusBadge } from '../components/StatusBadge';

export function Dashboard() {
  const { t } = useTranslation();
  const { servers, fetchServers, updateStatus } = useServerStore();
  const [todayCommands, setTodayCommands] = useState<number | null>(null);
  const [enabledSites, setEnabledSites] = useState<number | null>(null);

  useEffect(() => { fetchServers(); }, [fetchServers]);

  // Fetch today's command count and enabled sites count
  useEffect(() => {
    bridgeInvoke<{ todayCount: number }>('history:stats')
      .then(s => setTodayCommands(s.todayCount))
      .catch(() => {});
    bridgeInvoke<{ allowedSites: string[] | 'prompt' }>('sites:list')
      .then(s => setEnabledSites(s.allowedSites === 'prompt' ? -1 : s.allowedSites.length))
      .catch(() => {});
  }, []);

  const handleStatus = useCallback((...args: unknown[]) => {
    const data = args[0] as { serverId: string; status: string };
    updateStatus(data.serverId, data.status as any);
  }, [updateStatus]);

  useBridgeEvent('server:status', handleStatus);

  const connected = servers.filter(s => s.status === 'connected').length;
  const statusText = connected === servers.length && servers.length > 0
    ? t('allSystemsOperational')
    : connected > 0 ? t('partialDegradation') : t('allServicesDown');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('nav:dashboard')}</h1>
        <p className="text-muted-foreground mt-1">{statusText}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Server className="w-4 h-4" />
            <span className="text-sm">{t('servers')}</span>
          </div>
          <p className="text-2xl font-bold">{connected}/{servers.length}</p>
          <p className="text-xs text-muted-foreground">{t('online')}</p>
        </div>
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Terminal className="w-4 h-4" />
            <span className="text-sm">{t('commands')}</span>
          </div>
          <p className="text-2xl font-bold">{todayCommands !== null ? todayCommands : '—'}</p>
          <p className="text-xs text-muted-foreground">{t('today')}</p>
        </div>
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Globe className="w-4 h-4" />
            <span className="text-sm">{t('sites')}</span>
          </div>
          <p className="text-2xl font-bold">{enabledSites === null ? '—' : enabledSites === -1 ? 'All' : enabledSites}</p>
          <p className="text-xs text-muted-foreground">{t('enabled')}</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">{t('servers')}</h2>
        {servers.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('noServers')}</p>
        ) : (
          <div className="space-y-2">
            {servers.map(s => (
              <div key={s.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.wsUrl}</p>
                </div>
                <StatusBadge status={s.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
