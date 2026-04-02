import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { History as HistoryIcon, Download, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

interface HistoryRecord {
  id: string; serverId: string; serverName: string; site: string; action: string; args: string[];
  success: boolean; status: 'success' | 'error' | 'timeout'; exitCode: number;
  stdout: string; stderr: string; durationMs: number; startedAt: string; completedAt: string;
}
interface HistoryStats { total: number; success: number; failed: number; todayCount: number; }

export default function History() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [stats, setStats] = useState<HistoryStats>({ total: 0, success: 0, failed: 0, todayCount: 0 });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverFilter, setServerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [h, s] = await Promise.all([
        window.bridge.invoke('history:list'),
        window.bridge.invoke('history:stats'),
      ]);
      setRecords(h as HistoryRecord[]);
      setStats(s as HistoryStats);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const servers = useMemo(() => [...new Set(records.map(r => r.serverName))], [records]);

  const filtered = useMemo(() => {
    return records
      .filter(r => serverFilter === 'all' || r.serverName === serverFilter)
      .filter(r => statusFilter === 'all' || r.status === statusFilter)
      .filter(r => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return r.action.toLowerCase().includes(q) || r.site.toLowerCase().includes(q) || r.args.join(' ').toLowerCase().includes(q);
      })
      .reverse();
  }, [records, serverFilter, statusFilter, searchQuery]);

  const handleClear = async () => {
    if (!confirm('Clear all command history? This cannot be undone.')) return;
    await window.bridge.invoke('history:clear');
    await loadData();
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `opencli-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const statusColor = (s: string) => s === 'success' ? 'text-green-400' : s === 'error' ? 'text-red-400' : s === 'timeout' ? 'text-yellow-400' : '';

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <HistoryIcon className="h-4 w-4 text-primary" />
            <h1 className="text-lg font-semibold">History</h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>Total: {stats.total}</span>
            <span className="text-green-400">OK: {stats.success}</span>
            <span className="text-red-400">Failed: {stats.failed}</span>
            <span>Today: {stats.todayCount}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={serverFilter} onChange={e => setServerFilter(e.target.value)} className="bg-background border border-border rounded px-2 py-1 text-sm">
            <option value="all">All Servers</option>
            {servers.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-background border border-border rounded px-2 py-1 text-sm">
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
            <option value="timeout">Timeout</option>
          </select>
          <input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="bg-background border border-border rounded px-2 py-1 text-sm w-[180px]" />
          <div className="flex-1" />
          <button onClick={exportJSON} className="inline-flex items-center gap-1 px-3 py-1 text-xs border border-border rounded hover:bg-accent">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button onClick={handleClear} className="inline-flex items-center gap-1 px-3 py-1 text-xs border border-border rounded hover:bg-red-500/10 text-red-400">
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <HistoryIcon className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm">No history records found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0">
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2 w-8" />
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Server</th>
                <th className="px-3 py-2">Site / Action</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Duration</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(record => (
                <React.Fragment key={record.id}>
                  <tr className="border-b border-border/50 hover:bg-muted/30 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}>
                    <td className="px-3 py-2">{expandedId === record.id ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</td>
                    <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{new Date(record.startedAt).toLocaleString()}</td>
                    <td className="px-3 py-2">{record.serverName}</td>
                    <td className="px-3 py-2 font-medium">{record.site}/{record.action}</td>
                    <td className={`px-3 py-2 ${statusColor(record.status)}`}>{record.status}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">{(record.durationMs / 1000).toFixed(1)}s</td>
                  </tr>
                  {expandedId === record.id && (
                    <tr className="bg-muted/20">
                      <td colSpan={6} className="px-6 py-3">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div><p className="font-semibold mb-1">stdout</p><pre className="bg-background p-2 rounded border overflow-x-auto max-h-40 whitespace-pre-wrap">{record.stdout || '(empty)'}</pre></div>
                          <div><p className="font-semibold mb-1">stderr</p><pre className="bg-background p-2 rounded border overflow-x-auto max-h-40 whitespace-pre-wrap text-red-400">{record.stderr || '(empty)'}</pre></div>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground flex gap-4">
                          <span>Exit: {record.exitCode}</span><span>ID: {record.id}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
