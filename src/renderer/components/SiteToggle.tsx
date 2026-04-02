interface SiteToggleProps {
  site: string;
  enabled: boolean;
  onToggle: (site: string, enabled: boolean) => void;
}

export function SiteToggle({ site, enabled, onToggle }: SiteToggleProps) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/30">
      <label htmlFor={`site-${site}`} className="text-sm cursor-pointer">
        {site}
      </label>
      <button
        id={`site-${site}`}
        role="switch"
        aria-checked={enabled}
        onClick={() => onToggle(site, !enabled)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-muted'}`}
        aria-label={`${enabled ? 'Disable' : 'Enable'} ${site}`}
      >
        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${enabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}
