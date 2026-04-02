import { useState, useEffect } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
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

export function App() {
  useTheme('dark');
  const { servers, fetchServers } = useServerStore();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    fetchServers().then(() => {
      // Show welcome guide if no servers after initial load
      const state = useServerStore.getState();
      if (state.servers.length === 0) setShowWelcome(true);
    });
  }, [fetchServers]);

  return (
    <MemoryRouter>
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
