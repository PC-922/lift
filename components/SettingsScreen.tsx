import React, { useState, useRef } from 'react';
import { Download, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { t, getLanguage } from '../utils/translations';
import { preferencesService } from '../services/preferencesService';
import type { ScreenType } from './BottomNav';

interface Props {
  onExport: () => void;
  onImport: (content: string) => boolean;
}

const SCREEN_ORDER: ScreenType[] = ['home', 'insights', 'history', 'routines', 'settings'];

export const SettingsScreen: React.FC<Props> = ({ onExport, onImport }) => {
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [currentLang, setCurrentLang] = useState<'es' | 'en'>(() => getLanguage());
  const [currentDefaultScreen, setCurrentDefaultScreen] = useState<ScreenType | null>(
    () => preferencesService.getDefaultScreen()
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = onImport(content);

      if (success) {
        setImportStatus('success');
        setTimeout(() => setImportStatus('idle'), 1500);
      } else {
        setImportStatus('error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSetLanguage = (lang: 'es' | 'en') => {
    preferencesService.setLanguage(lang);
    setCurrentLang(lang);
    window.location.reload();
  };

  const handleSetDefaultScreen = (screen: ScreenType) => {
    preferencesService.setDefaultScreen(screen);
    setCurrentDefaultScreen(screen);
  };

  const screenLabel = (screen: ScreenType): string => {
    const map: Record<ScreenType, string> = {
      home: t.labels.home,
      insights: t.labels.insights,
      history: t.labels.history,
      routines: t.labels.routines,
      settings: t.labels.settings,
    };
    return map[screen];
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-ios-text">{t.labels.settings}</h1>
        <p className="text-sm text-ios-gray mt-2">{t.labels.settingsDesc}</p>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold text-ios-gray uppercase tracking-wide ml-1">{t.labels.language}</p>
        <div className="flex gap-2">
          {(['es', 'en'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => handleSetLanguage(lang)}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors active:opacity-70 ${
                currentLang === lang
                  ? 'bg-ios-blue text-white'
                  : 'bg-ios-card text-ios-text'
              }`}
            >
              {lang === 'es' ? t.labels.languageES : t.labels.languageEN}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold text-ios-gray uppercase tracking-wide ml-1">{t.labels.defaultScreen}</p>
        <div className="flex flex-wrap gap-2">
          {SCREEN_ORDER.map((screen) => (
            <button
              key={screen}
              onClick={() => handleSetDefaultScreen(screen)}
              className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors active:opacity-70 ${
                currentDefaultScreen === screen
                  ? 'bg-ios-blue text-white'
                  : 'bg-ios-card text-ios-text'
              }`}
            >
              {screenLabel(screen)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold text-ios-gray uppercase tracking-wide ml-1">Backup</p>
        <button
          onClick={onExport}
          className="w-full flex items-center justify-between p-4 bg-ios-card rounded-xl active:opacity-70 transition-opacity"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-ios-blue">
              <Download size={20} />
            </div>
            <div className="text-left">
              <div className="font-semibold text-ios-text">{t.actions.export}</div>
              <div className="text-xs text-ios-gray">{t.labels.exportDesc}</div>
            </div>
          </div>
        </button>

        <button
          onClick={handleImportClick}
          className="w-full flex items-center justify-between p-4 bg-ios-card rounded-xl active:opacity-70 transition-opacity"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
              <Upload size={20} />
            </div>
            <div className="text-left">
              <div className="font-semibold text-ios-text">{t.actions.import}</div>
              <div className="text-xs text-ios-gray">{t.labels.importDesc}</div>
            </div>
          </div>
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          className="hidden"
        />

        {importStatus === 'success' && (
          <div className="flex items-center gap-2 justify-center text-green-600 dark:text-green-400 pt-2 animate-fadeIn">
            <CheckCircle2 size={16} />
            <span className="text-sm font-medium">{t.labels.importSuccess}</span>
          </div>
        )}
        {importStatus === 'error' && (
          <div className="flex items-center gap-2 justify-center text-red-500 pt-2 animate-fadeIn">
            <AlertCircle size={16} />
            <span className="text-sm font-medium">{t.labels.importError}</span>
          </div>
        )}
      </div>

      <div className="pt-6 border-t border-ios-separator">
        <p className="text-xs text-ios-gray text-center leading-relaxed">
          {t.labels.settingsInfo}
        </p>
      </div>
    </div>
  );
};
