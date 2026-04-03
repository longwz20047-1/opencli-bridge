import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { bridgeInvoke } from '../hooks/useBridge';

interface SettingsData {
  autoStart: boolean;
  autoUpdate: boolean;
  enforceWss: boolean;
  closeAction: 'minimize' | 'quit';
  commandTimeout: number;
  maxHistoryRecords: number;
  theme: 'dark' | 'light' | 'system';
  locale: 'zh-CN' | 'en-US';
  logLevel: string;
}

export function Settings() {
  const { t, i18n } = useTranslation('settings');
  const [settings, setSettings] = useState<SettingsData | null>(null);

  useEffect(() => {
    bridgeInvoke<SettingsData>('settings:get').then(setSettings).catch(() => {});
  }, []);

  const update = async (key: string, value: unknown) => {
    if (!settings) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await bridgeInvoke('settings:update', { [key]: value });
    if (key === 'locale') i18n.changeLanguage(value as string);
    if (key === 'theme') window.dispatchEvent(new CustomEvent('theme-change', { detail: value }));
  };

  if (!settings) return <div className="p-6 text-muted-foreground">Loading settings...</div>;

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>

      <section className="space-y-4">
        <h2 className="text-lg font-medium border-b border-border pb-2">{t('application')}</h2>
        <SettingRow label={t('autoStart')} desc={t('autoStartDesc')}>
          <ToggleSwitch checked={settings.autoStart} onChange={(v) => update('autoStart', v)} />
        </SettingRow>
        <SettingRow label={t('autoUpdate')} desc={t('autoUpdateDesc')}>
          <ToggleSwitch checked={settings.autoUpdate} onChange={(v) => update('autoUpdate', v)} />
        </SettingRow>
        <SettingRow label={t('closeAction')} desc={t('closeActionDesc')}>
          <select
            value={settings.closeAction}
            onChange={(e) => update('closeAction', e.target.value)}
            className="bg-background border border-border rounded px-2 py-1 text-sm"
          >
            <option value="minimize">{t('minimizeToTray')}</option>
            <option value="quit">{t('quitApplication')}</option>
          </select>
        </SettingRow>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium border-b border-border pb-2">{t('commands')}</h2>
        <SettingRow label={t('commandTimeout')} desc={t('commandTimeoutDesc')}>
          <input
            type="number"
            value={settings.commandTimeout}
            onChange={(e) => update('commandTimeout', Number(e.target.value))}
            className="bg-background border border-border rounded px-2 py-1 text-sm w-20"
          />
        </SettingRow>
        <SettingRow label={t('historyLimit')} desc={t('historyLimitDesc')}>
          <input
            type="number"
            value={settings.maxHistoryRecords}
            onChange={(e) => update('maxHistoryRecords', Number(e.target.value))}
            className="bg-background border border-border rounded px-2 py-1 text-sm w-20"
          />
        </SettingRow>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium border-b border-border pb-2">{t('security')}</h2>
        <SettingRow label={t('enforceWss')} desc={t('enforceWssDesc')}>
          <ToggleSwitch checked={settings.enforceWss} onChange={(v) => update('enforceWss', v)} />
        </SettingRow>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium border-b border-border pb-2">{t('appearance')}</h2>
        <SettingRow label={t('theme')} desc={t('themeDesc')}>
          <select
            value={settings.theme}
            onChange={(e) => update('theme', e.target.value)}
            className="bg-background border border-border rounded px-2 py-1 text-sm"
          >
            <option value="dark">{t('themeDark')}</option>
            <option value="light">{t('themeLight')}</option>
            <option value="system">{t('themeSystem')}</option>
          </select>
        </SettingRow>
        <SettingRow label={t('language')} desc={t('languageDesc')}>
          <select
            value={settings.locale}
            onChange={(e) => update('locale', e.target.value)}
            className="bg-background border border-border rounded px-2 py-1 text-sm"
          >
            <option value="zh-CN">中文</option>
            <option value="en-US">English</option>
          </select>
        </SettingRow>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium border-b border-border pb-2">{t('debug')}</h2>
        <SettingRow label={t('logLevel')} desc={t('logLevelDesc')}>
          <select
            value={settings.logLevel}
            onChange={(e) => update('logLevel', e.target.value)}
            className="bg-background border border-border rounded px-2 py-1 text-sm"
          >
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warn">Warn</option>
            <option value="error">Error</option>
          </select>
        </SettingRow>
      </section>
    </div>
  );
}

function SettingRow({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}
