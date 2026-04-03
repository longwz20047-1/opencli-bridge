import { useState, useEffect } from 'react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppLayout } from './layouts/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Servers } from './pages/Servers';
import { Settings } from './pages/Settings';
import Monitor from './pages/Monitor';
import History from './pages/History';
import SiteControl from './pages/SiteControl';
import { WelcomeGuide } from './components/WelcomeGuide';
import { useTheme } from './hooks/useTheme';
import { useServerStore } from './stores/useServerStore';
import { bridgeInvoke, useBridgeEvent } from './hooks/useBridge';

function NavigateListener() {
  const navigate = useNavigate();
  useBridgeEvent('navigate', (...args: unknown[]) => {
    const path = (args[0] as { path?: string })?.path;
    if (path) navigate(path);
  });
  return null;
}

export function App() {
  const { setTheme } = useTheme('dark');
  const { i18n } = useTranslation();
  const { servers, fetchServers } = useServerStore();
  const [showWelcome, setShowWelcome] = useState(false);

  // Load saved theme and locale from config (P1 #6 fix)
  useEffect(() => {
    bridgeInvoke<{ theme?: string; locale?: string }>('settings:get')
      .then(s => {
        if (s.theme) setTheme(s.theme as 'dark' | 'light' | 'system');
        if (s.locale) i18n.changeLanguage(s.locale);
      })
      .catch(() => {});
  }, [setTheme, i18n]);

  // Listen for theme changes from Settings page
  useEffect(() => {
    const onThemeChange = (e: Event) => setTheme((e as CustomEvent).detail);
    window.addEventListener('theme-change', onThemeChange);
    return () => window.removeEventListener('theme-change', onThemeChange);
  }, [setTheme]);

  useEffect(() => {
    fetchServers().then(() => {
      // Show welcome guide if no servers after initial load
      const state = useServerStore.getState();
      if (state.servers.length === 0) setShowWelcome(true);
    });
  }, [fetchServers]);

  return (
    <MemoryRouter>
      <NavigateListener />
      {showWelcome && (
        <WelcomeGuide onConnected={() => { setShowWelcome(false); fetchServers(); }} />
      )}
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/servers" element={<Servers />} />
          <Route path="/monitor" element={<Monitor />} />
          <Route path="/history" element={<History />} />
          <Route path="/sites" element={<SiteControl />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}
