import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Servers } from './pages/Servers';
import { Settings } from './pages/Settings';
import { useTheme } from './hooks/useTheme';

export function App() {
  useTheme('dark');

  return (
    <MemoryRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/servers" element={<Servers />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}
