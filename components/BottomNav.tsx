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
      className="fixed bottom-0 left-0 right-0 z-30 px-2"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
      }}
    >
      <div className="bottom-nav-shell mx-auto max-w-lg overflow-hidden bg-app-surface/95 shadow-[0_-10px_30px_rgba(17,24,39,0.08)] backdrop-blur-2xl dark:shadow-[0_-10px_30px_rgba(0,0,0,0.28)]">
        <div className="relative grid h-[4.7rem] grid-cols-5 pt-2">
          <span
            aria-hidden="true"
            className="bottom-nav-indicator pointer-events-none absolute left-0 top-[2.75rem] h-[3px] w-[20%] rounded-full transition-transform duration-300 ease-out"
            style={{ transform: `translateX(${activeIndex * 100}%)` }}
          />
          <span
            aria-hidden="true"
            className="bottom-nav-label pointer-events-none absolute bottom-2 left-0 w-[20%] truncate px-1 text-center text-[10px] font-black uppercase tracking-[0.16em] opacity-100 transition-transform duration-300 ease-out"
            style={{ transform: `translateX(${activeIndex * 100}%)` }}
          >
            {activeItem.label}
          </span>

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
                  'relative z-10 flex h-full min-w-0 items-start justify-center rounded-xl pt-2 transition-colors duration-200 active:scale-90',
                  isActive ? 'bottom-nav-active' : 'text-app-text-muted'
                )}
              >
                <span className="flex h-7 w-7 items-center justify-center">{item.icon}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
