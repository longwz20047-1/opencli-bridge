import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'connected' | 'disconnected' | 'connecting';
}

const styleMap = {
  connected: { bg: 'bg-green-500/20 text-green-400', icon: '●', key: 'connected' },
  connecting: { bg: 'bg-yellow-500/20 text-yellow-400', icon: '◐', key: 'connecting' },
  disconnected: { bg: 'bg-red-500/20 text-red-400', icon: '○', key: 'disconnected' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation();
  const c = styleMap[status];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', c.bg)}>
      <span>{c.icon}</span><span>{t(c.key)}</span>
    </span>
  );
}
