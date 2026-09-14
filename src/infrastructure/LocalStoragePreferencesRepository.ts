import type {
  AuthMode,
  PreferencesRepository,
  Prefs,
  ScreenType,
} from '../domain/PreferencesRepository';
export type { AuthMode, Prefs, ScreenType } from '../domain/PreferencesRepository';
export const PREFS_KEY = 'lift_prefs_v1';

const DEFAULT_PREFS: Prefs = {
  onboardingDone: false,
  language: null,
  defaultScreen: null,
  authMode: null,
  lastUid: null,
};

type PrefsListener = () => void;

const listeners = new Set<PrefsListener>();

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

function getPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function savePrefs(partial: Partial<Prefs>): void {
  try {
    const current = getPrefs();
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...partial }));
  } catch {
  } finally {
    notifyListeners();
  }
}

function getLanguage(): 'es' | 'en' | null {
  return getPrefs().language;
}

function setLanguage(lang: 'es' | 'en'): void {
  savePrefs({ language: lang });
}

function getDefaultScreen(): ScreenType | null {
  return getPrefs().defaultScreen;
}

function setDefaultScreen(screen: ScreenType): void {
  savePrefs({ defaultScreen: screen });
}

function isOnboardingDone(): boolean {
  return getPrefs().onboardingDone;
}

function markOnboardingDone(): void {
  savePrefs({ onboardingDone: true });
}

function subscribe(listener: PrefsListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getLastUid(): string | null {
  return getPrefs().lastUid ?? null;
}

function setLastUid(uid: string | null): void {
  savePrefs({ lastUid: uid });
}

export const localStoragePreferencesRepository: PreferencesRepository = {
  getPrefs,
  savePrefs,
  getLanguage,
  setLanguage,
  getDefaultScreen,
  setDefaultScreen,
  isOnboardingDone,
  markOnboardingDone,
  getLastUid,
  setLastUid,
  subscribe,
};
