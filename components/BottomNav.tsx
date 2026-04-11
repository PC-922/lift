import React from 'react';
import { Home, BarChart3, Settings, ListChecks } from 'lucide-react';
import { useTranslations } from '../utils/translations';

export type ScreenType = 'home' | 'insights' | 'routines' | 'settings';

interface Props {
  currentScreen: ScreenType;
  onScreenChange: (screen: ScreenType) => void;
  onScreenReset: (screen: ScreenType) => void;
}

export const BottomNav: React.FC<Props> = ({ currentScreen, onScreenChange, onScreenReset }) => {
  const t = useTranslations();
  const navItems: { id: ScreenType; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: t.labels.home, icon: <Home size={22} /> },
    { id: 'insights', label: t.labels.insights, icon: <BarChart3 size={22} /> },
    { id: 'routines', label: t.labels.routines, icon: <ListChecks size={22} /> },
    { id: 'settings', label: t.labels.settings, icon: <Settings size={22} /> },
  ];

  const handleTap = (screen: ScreenType) => {
    if (screen === currentScreen) {
      onScreenReset(screen);
    } else {
      onScreenChange(screen);
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-ios-card/95 backdrop-blur-md border-t border-ios-separator z-30"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <div className="flex justify-around max-w-lg mx-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleTap(item.id)}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors active:opacity-70 ${
              currentScreen === item.id
                ? 'text-ios-blue'
                : 'text-ios-gray hover:text-ios-text'
            }`}
            aria-label={item.label}
          >
            <div className="w-6 h-6 flex items-center justify-center">{item.icon}</div>
            <span className="text-[10px] font-semibold text-center leading-none truncate">{item.label}</span>
            {currentScreen === item.id && (
              <div className="h-0.5 w-6 bg-ios-blue rounded-full"></div>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};
