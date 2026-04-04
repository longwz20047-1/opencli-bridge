import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Rocket, ClipboardPaste, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { bridgeInvoke } from '../hooks/useBridge';

interface WelcomeGuideProps {
  onConnected: () => void;
  onSkip?: () => void;
}

type ConnectState = 'idle' | 'connecting' | 'success' | 'error';

export function WelcomeGuide({ onConnected, onSkip }: WelcomeGuideProps) {
  const { t } = useTranslation();
  const [configString, setConfigString] = useState('');
  const [connectState, setConnectState] = useState<ConnectState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleConnect = useCallback(async () => {
    let value = configString.trim();
    if (!value) return;

    if (value.startsWith('obk://')) {
      value = value.slice(6);
    }

    if (!value.match(/^[A-Za-z0-9_-]+=*$/)) {
      setConnectState('error');
      setErrorMessage(t('invalidConfigFormat'));
      return;
    }

    setConnectState('connecting');
    setErrorMessage('');

    try {
      await bridgeInvoke('servers:add', value);
      setConnectState('success');
      setTimeout(() => onConnected(), 1500);
    } catch (err: any) {
      setConnectState('error');
      setErrorMessage(err?.message || t('connectionFailed'));
    }
  }, [configString, onConnected, t]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setConfigString(text);
    } catch {
      // Clipboard permission denied
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Rocket className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">{t('welcomeTitle')}</h1>
          <p className="text-muted-foreground mt-2">{t('welcomeSubtitle')}</p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 mb-6">
          <h2 className="text-sm font-semibold mb-3">{t('howToConnect')}</h2>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="flex items-center justify-center shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
              <span dangerouslySetInnerHTML={{ __html: t('step1') }} />
            </li>
            <li className="flex items-start gap-3">
              <span className="flex items-center justify-center shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
              <span dangerouslySetInnerHTML={{ __html: t('step2') }} />
            </li>
            <li className="flex items-start gap-3">
              <span className="flex items-center justify-center shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
              <span dangerouslySetInnerHTML={{ __html: t('step3') }} />
            </li>
          </ol>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              placeholder={t('pasteHint')}
              value={configString}
              onChange={e => { setConfigString(e.target.value); setConnectState('idle'); setErrorMessage(''); }}
              onKeyDown={e => e.key === 'Enter' && handleConnect()}
              className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={connectState === 'connecting' || connectState === 'success'}
            />
            <button onClick={handlePaste} className="p-2 border border-border rounded-md hover:bg-accent" aria-label="Paste">
              <ClipboardPaste className="h-4 w-4" />
            </button>
          </div>

          <button
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            onClick={handleConnect}
            disabled={!configString.trim() || connectState === 'connecting' || connectState === 'success'}
          >
            {connectState === 'connecting' && t('connecting')}
            {connectState === 'success' && <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {t('connectedRedirecting')}</span>}
            {connectState === 'error' && t('retry')}
            {connectState === 'idle' && t('connect')}
          </button>

          {connectState === 'error' && (
            <div className="flex items-start gap-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <div className="text-center mt-6 flex items-center justify-center gap-4">
          {onSkip && (
            <button
              onClick={onSkip}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {t('skipForNow')}
            </button>
          )}
          <a href="#" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            {t('needHelp')} <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
