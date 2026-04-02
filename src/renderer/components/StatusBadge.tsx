import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'connected' | 'disconnected' | 'connecting';
}

const config = {
  connected: { bg: 'bg-green-500/20 text-green-400', label: 'Connected', icon: '●' },
  connecting: { bg: 'bg-yellow-500/20 text-yellow-400', label: 'Connecting', icon: '◐' },
  disconnected: { bg: 'bg-red-500/20 text-red-400', label: 'Disconnected', icon: '○' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const c = config[status];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', c.bg)}>
      <span>{c.icon}</span><span>{c.label}</span>
    </span>
  );
}
