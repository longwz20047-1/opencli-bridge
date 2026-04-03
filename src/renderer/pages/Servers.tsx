import { useEffect, useCallback, useState } from 'react';
import { Server, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useServerStore } from '../stores/useServerStore';
import { useBridgeEvent, bridgeInvoke } from '../hooks/useBridge';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { WelcomeGuide } from '../components/WelcomeGuide';

export function Servers() {
  const { servers, loading, fetchServers, updateStatus } = useServerStore();
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { fetchServers(); }, [fetchServers]);

  const handleStatus = useCallback((...args: unknown[]) => {
    const data = args[0] as { serverId: string; status: string };
    updateStatus(data.serverId, data.status as any);
  }, [updateStatus]);

  useBridgeEvent('server:status', handleStatus);

  const handleReconnect = async (serverId: string) => {
    await bridgeInvoke('servers:reconnect', serverId);
  };

  const handleRemove = async (serverId: string) => {
    if (!confirm('Remove this server? This will disconnect and delete the configuration.')) return;
    await bridgeInvoke('servers:remove', serverId);
    fetchServers();
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      {showAdd && (
        <WelcomeGuide onConnected={() => { setShowAdd(false); fetchServers(); }} />
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Servers</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> Add Server
        </button>
      </div>

      {servers.length === 0 ? (
        <EmptyState
          icon={<Server className="w-12 h-12" />}
          title="No servers configured"
          description="Add your first server to get started"
        />
      ) : (
        <div className="grid gap-4">
          {servers.map(s => (
            <div key={s.id} className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.wsUrl}</p>
                  </div>
                </div>
                <StatusBadge status={s.status} />
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                <button
                  onClick={() => handleReconnect(s.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-border rounded-md hover:bg-accent"
                >
                  <RefreshCw className="w-3 h-3" /> Reconnect
                </button>
                <button
                  onClick={() => handleRemove(s.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-border rounded-md hover:bg-destructive/10 text-destructive"
                >
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
                <span className="ml-auto text-xs text-muted-foreground">
                  {s.projects.length} project{s.projects.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
