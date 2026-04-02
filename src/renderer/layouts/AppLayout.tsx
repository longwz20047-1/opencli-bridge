import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Server, Activity, History, Shield, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Server, label: 'Servers', path: '/servers' },
  { icon: Activity, label: 'Monitor', path: '/monitor' },
  { icon: History, label: 'History', path: '/history' },
  { icon: Shield, label: 'Site Control', path: '/sites' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(window.innerWidth < 960);

  useEffect(() => {
    const handler = () => setCollapsed(window.innerWidth < 960);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <nav
        role="navigation"
        aria-label="Main navigation"
        className={cn(
          'flex flex-col border-r border-border bg-card transition-all duration-200',
          collapsed ? 'w-[60px]' : 'w-[200px]',
        )}
      >
        <div className="flex-1 py-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      <main role="main" className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
