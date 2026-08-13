import React from 'react';
import { BarChart3, Dumbbell, Home, ListChecks, Settings } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslations } from '../utils/translations';
import { cn } from '../utils/cn';

export type ScreenType = 'home' | 'insights' | 'workout' | 'routines' | 'settings';

const paths: Record<ScreenType, string> = {
  home: '/',
  insights: '/insights',
  workout: '/workout',
  routines: '/routines',
  settings: '/settings',
};

const screenOrder: ScreenType[] = ['home', 'insights', 'workout', 'routines', 'settings'];

function getScreenForPath(pathname: string): ScreenType {
  if (pathname === '/' || pathname.startsWith('/exercises/')) return 'home';
  if (pathname === '/insights' || pathname.startsWith('/insights/')) return 'insights';
  if (pathname === '/workout') return 'workout';
  if (pathname === '/routines' || pathname.startsWith('/routines/')) return 'routines';
  if (pathname === '/settings' || pathname.startsWith('/settings/')) return 'settings';
  return 'home';
}

export const BottomNav: React.FC = () => {
  const t = useTranslations();
  const { pathname } = useLocation();
  const currentScreen = getScreenForPath(pathname);
  const activeIndex = screenOrder.indexOf(currentScreen);

  const navItems: { id: ScreenType; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: t.labels.home, icon: <Home size={21} strokeWidth={2.25} /> },
    { id: 'insights', label: t.labels.insights, icon: <BarChart3 size={21} strokeWidth={2.25} /> },
    { id: 'workout', label: t.labels.workout, icon: <Dumbbell size={21} strokeWidth={2.25} /> },
    { id: 'routines', label: t.labels.routines, icon: <ListChecks size={21} strokeWidth={2.25} /> },
    { id: 'settings', label: t.labels.settings, icon: <Settings size={21} strokeWidth={2.25} /> },
  ];

  const activeItem = navItems[activeIndex];

  return (
    <nav
      aria-label="Primary navigation"
      className="fixed bottom-0 left-0 right-0 z-30 bg-app-surface/95 shadow-[0_-10px_30px_rgba(17,24,39,0.08)] backdrop-blur-2xl dark:shadow-[0_-10px_30px_rgba(0,0,0,0.28)]"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <div className="bottom-nav-shell w-full overflow-hidden">
        <div className="grid h-full grid-rows-[3.25rem_2rem]">
          <div className="grid grid-cols-5">
            {navItems.map((item) => {
              const isActive = currentScreen === item.id;
              return (
                <NavLink
                  key={item.id}
                  to={paths[item.id]}
                  end={item.id === 'home'}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'relative z-10 flex h-full min-w-0 items-center justify-center transition-colors duration-200 active:scale-90',
                    isActive ? 'bottom-nav-active' : 'text-app-text-muted'
                  )}
                >
                  <span className="flex h-8 w-8 items-center justify-center">{item.icon}</span>
                </NavLink>
              );
            })}
          </div>

          <div className="bottom-nav-divider flex min-w-0 items-center justify-center px-4">
            <span aria-hidden="true" className="bottom-nav-label truncate text-xs font-semibold tracking-wide">
              {activeItem.label}
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
};
