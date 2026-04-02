import { useRef, useEffect } from 'react';
import { useCommandLog } from '../hooks/useCommandLog';
import { CommandLogItem } from '../components/CommandLogItem';
import { Pause, Play, Trash2, Activity } from 'lucide-react';

const MAX_DISPLAY = 200;

export default function Monitor() {
  const { commands, autoscroll, setAutoscroll, clearMonitor } = useCommandLog(MAX_DISPLAY);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoscroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [commands, autoscroll]);

  const executing = commands.filter(c => c.status === 'executing').length;
  const succeeded = commands.filter(c => c.status === 'success').length;
  const failed = commands.filter(c => c.status === 'error' || c.status === 'timeout').length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h1 className="text-lg font-semibold">Monitor</h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{commands.length} commands</span>
            {executing > 0 && <span className="text-primary">{executing} running</span>}
            {succeeded > 0 && <span className="text-green-400">{succeeded} ok</span>}
            {failed > 0 && <span className="text-red-400">{failed} failed</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAutoscroll(!autoscroll)} className="inline-flex items-center gap-1 px-2 py-1 text-sm rounded hover:bg-accent">
            {autoscroll ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {autoscroll ? 'Pause' : 'Resume'}
          </button>
          <button onClick={clearMonitor} className="inline-flex items-center gap-1 px-2 py-1 text-sm rounded hover:bg-accent">
            <Trash2 className="h-4 w-4" /> Clear
          </button>
        </div>
      </div>

      {commands.length >= MAX_DISPLAY && (
        <div className="px-4 py-1.5 bg-muted/50 text-xs text-muted-foreground text-center border-b">
          Showing latest {MAX_DISPLAY} commands. Older entries are available in History.
        </div>
      )}

      <div className="flex-1 overflow-y-auto" role="log" aria-live="polite" aria-label="Command activity log">
        {commands.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Activity className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm">Waiting for commands...</p>
            <p className="text-xs mt-1">Commands from connected servers will appear here in real time.</p>
          </div>
        ) : (
          commands.map(cmd => <CommandLogItem key={cmd.id} command={cmd} />)
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}
