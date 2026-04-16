import React, { useState, useRef, useSyncExternalStore } from 'react';
import { Download, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTranslations, useLanguage } from '../utils/translations';
import { preferencesService } from '../services/preferencesService';
import type { ScreenType } from './BottomNav';
import { Badge } from './ui/Badge';
import { ListRow } from './ui/ListRow';
import { Select } from './ui/Select';

interface Props {
  onExport: () => void;
  onImport: (content: string) => boolean;
}

const SCREEN_ORDER: ScreenType[] = ['home', 'insights', 'routines', 'settings'];

export const SettingsScreen: React.FC<Props> = ({ onExport, onImport }) => {
  const t = useTranslations();
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const currentLang = useLanguage();
  const currentDefaultScreen = useSyncExternalStore(
    preferencesService.subscribe,
    preferencesService.getDefaultScreen,
    preferencesService.getDefaultScreen
  ) ?? 'home';
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

  const screenLabel = (screen: ScreenType): string => {
    const map: Record<ScreenType, string> = {
      home: t.labels.home,
      insights: t.labels.insights,
      routines: t.labels.routines,
      settings: t.labels.settings,
    };
    return map[screen];
  };

  return (
    <div className="space-y-6">
      <p className="-mt-2 mb-2 text-center text-sm text-app-text-muted">{t.labels.settingsDesc}</p>

      <div className="space-y-3">
        <p className="ml-1 text-xs font-semibold uppercase tracking-wide text-app-text-muted">{t.labels.language}</p>
        <Select
          value={currentLang}
          onChange={(event) => preferencesService.setLanguage(event.target.value as 'es' | 'en')}
          aria-label={t.labels.language}
        >
          <option value="es">{t.labels.languageES}</option>
          <option value="en">{t.labels.languageEN}</option>
        </Select>
      </div>

      <div className="space-y-3">
        <p className="ml-1 text-xs font-semibold uppercase tracking-wide text-app-text-muted">{t.labels.defaultScreen}</p>
        <Select
          value={currentDefaultScreen}
          onChange={(event) => preferencesService.setDefaultScreen(event.target.value as ScreenType)}
          aria-label={t.labels.defaultScreen}
        >
          {SCREEN_ORDER.map((screen) => (
            <option key={screen} value={screen}>{screenLabel(screen)}</option>
          ))}
        </Select>
      </div>

      <div className="space-y-3">
        <p className="ml-1 text-xs font-semibold uppercase tracking-wide text-app-text-muted">Backup</p>
        <ListRow padded={false}>
          <button onClick={onExport} className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors active:bg-app-surface-muted sm:px-5 sm:py-5">
            <Badge variant="accent" className="rounded-xl px-3 py-3"><Download size={20} /></Badge>
            <div className="text-left">
              <div className="font-semibold text-app-text">{t.actions.export}</div>
              <div className="text-xs text-app-text-muted">{t.labels.exportDesc}</div>
            </div>
          </button>
        </ListRow>

         <ListRow padded={false}>
           <button onClick={handleImportClick} className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors active:bg-app-surface-muted sm:px-5 sm:py-5">
             <Badge variant="accent" className="rounded-xl px-3 py-3"><Upload size={20} /></Badge>
             <div className="text-left">
               <div className="font-semibold text-app-text">{t.actions.import}</div>
               <div className="text-xs text-app-text-muted">{t.labels.importDesc}</div>
             </div>
           </button>
         </ListRow>

        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />

        {importStatus === 'success' && (
          <div className="flex items-center justify-center gap-2 pt-2 text-app-success animate-fadeIn">
            <CheckCircle2 size={16} />
            <span className="text-sm font-medium">{t.labels.importSuccess}</span>
          </div>
        )}
        {importStatus === 'error' && (
          <div className="flex items-center justify-center gap-2 pt-2 text-app-danger animate-fadeIn">
            <AlertCircle size={16} />
            <span className="text-sm font-medium">{t.labels.importError}</span>
          </div>
        )}
      </div>

      <div className="border-t border-app-border pt-6">
        <p className="text-center text-xs leading-relaxed text-app-text-muted">{t.labels.settingsInfo}</p>
      </div>
    </div>
  );
};
