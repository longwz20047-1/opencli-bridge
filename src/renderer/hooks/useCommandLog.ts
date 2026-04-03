import { useEffect, useRef, useState, useCallback } from 'react';

interface CommandEvent {
  id: string;
  serverId: string;
  site: string;
  action: string;
  args: string[];
  status: 'executing' | 'success' | 'error' | 'timeout';
  startedAt: string;
  durationMs?: number;
  stdout?: string;
  stderr?: string;
}

export type { CommandEvent };

export function useCommandLog(maxRecords = 200) {
  const [commands, setCommands] = useState<CommandEvent[]>([]);
  const [autoscroll, setAutoscroll] = useState(true);
  const pendingUpdates = useRef<CommandEvent[]>([]);
  const rafId = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!window.bridge) {
      console.error('[useCommandLog] Bridge not available');
      return () => {};
    }
    const bridge = window.bridge;

    const unsubReceived = bridge.on('command:received', (...args: unknown[]) => {
      const event = args[0] as any;
      pendingUpdates.current.push({ ...event, status: 'executing', startedAt: new Date().toISOString() });
      if (!rafId.current) {
        rafId.current = requestAnimationFrame(() => {
          setCommands(prev => [...prev, ...pendingUpdates.current].slice(-maxRecords));
          pendingUpdates.current = [];
          rafId.current = undefined;
        });
      }
    });

    const unsubCompleted = bridge.on('command:completed', (...args: unknown[]) => {
      const event = args[0] as any;
      setCommands(prev =>
        prev.map(c => c.id === event.id ? { ...c, ...event, status: event.success ? 'success' : (event.exitCode === 124 ? 'timeout' : 'error') } : c)
      );
    });

    return () => {
      unsubReceived();
      unsubCompleted();
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [maxRecords]);

  const clearMonitor = useCallback(() => setCommands([]), []);

  return { commands, autoscroll, setAutoscroll, clearMonitor };
}
