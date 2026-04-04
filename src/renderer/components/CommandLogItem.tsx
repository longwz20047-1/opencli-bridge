import { useTranslation } from 'react-i18next';
import type { CommandEvent } from '../hooks/useCommandLog';

interface CommandLogItemProps {
  command: CommandEvent;
}

export function CommandLogItem({ command }: CommandLogItemProps) {
  const { t } = useTranslation();

  const statusColor = {
    executing: 'text-primary',
    success: 'text-green-400',
    error: 'text-red-400',
    timeout: 'text-yellow-400',
  };

  const statusLabel = {
    executing: t('executing'),
    success: t('success'),
    error: t('error'),
    timeout: t('timeout'),
  };

  return (
    <article className="flex items-start gap-3 py-2 px-3 font-mono text-sm border-b border-border/50 hover:bg-muted/30">
      <time dateTime={command.startedAt} className="text-muted-foreground shrink-0 w-20">
        {new Date(command.startedAt).toLocaleTimeString()}
      </time>
      <span className="font-medium shrink-0">{command.site}/{command.action}</span>
      <span className="text-muted-foreground truncate flex-1">{command.args?.join(' ')}</span>
      <span className={`shrink-0 ${statusColor[command.status]}`}>
        {statusLabel[command.status]}
      </span>
      {command.durationMs != null && (
        <span className="text-muted-foreground shrink-0 w-16 text-right">
          {(command.durationMs / 1000).toFixed(1)}s
        </span>
      )}
    </article>
  );
}
