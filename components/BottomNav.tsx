import React from 'react';
import { Home, BarChart3, Settings, ListChecks } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslations } from '../utils/translations';
import { cn } from '../utils/cn';

export type ScreenType = 'home' | 'insights' | 'routines' | 'settings';

const paths: Record<ScreenType, string> = {
  home: '/',
  insights: '/insights',
  routines: '/routines',
  settings: '/settings',
};

const screenByPath: Record<string, ScreenType> = {
  '/': 'home',
  '/insights': 'insights',
  '/routines': 'routines',
  '/settings': 'settings',
};

export const BottomNav: React.FC = () => {
  const t = useTranslations();
  const location = useLocation();
  const navigate = useNavigate();

  const currentScreen = screenByPath[location.pathname] ?? 'home';

  const navItems: { id: ScreenType; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: t.labels.home, icon: <Home size={22} /> },
    { id: 'insights', label: t.labels.insights, icon: <BarChart3 size={22} /> },
    { id: 'routines', label: t.labels.routines, icon: <ListChecks size={22} /> },
    { id: 'settings', label: t.labels.settings, icon: <Settings size={22} /> },
  ];

  const handleTap = (screen: ScreenType) => {
    if (screen === currentScreen) {
      navigate(paths[screen], { replace: true });
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 border-app-border/80 bg-app-surface backdrop-blur-2xl"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <div className="mx-auto flex max-w-lg justify-around px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={paths[item.id]}
            onClick={() => handleTap(item.id)}
            className={({ isActive }) => cn(
              'flex flex-1 flex-col items-center justify-center gap-1.5 py-4 transition-all active:scale-90 rounded-lg mx-1',
              isActive
                ? 'bg-app-accent text-black'
                : 'text-app-text-muted'
            )}
            aria-label={item.label}
            aria-current={currentScreen === item.id ? 'page' : undefined}
          >
            <div className="w-6 h-6 flex items-center justify-center">
              {item.icon}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest leading-none text-center truncate">
              {item.label}
            </span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
