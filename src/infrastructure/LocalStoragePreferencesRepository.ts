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
  localProfileId: null,
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

function localProfileId(): string {
  const prefs = getPrefs();
  if (prefs.localProfileId) return prefs.localProfileId;

  // Reuse the old profile identifier once so pre-local-first data stays reachable.
  const legacyProfileId = prefs.lastUid;
  const generated = `local_${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
  const next = legacyProfileId ?? generated;
  savePrefs({ localProfileId: next });
  return next;
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
  getLocalProfileId: localProfileId,
  subscribe,
};
