import type { ScreenType } from '../components/BottomNav';

const PREFS_KEY = 'lift_prefs_v1';

interface Prefs {
  onboardingDone: boolean;
  language: 'es' | 'en' | null;
  defaultScreen: ScreenType | null;
}

const DEFAULT_PREFS: Prefs = {
  onboardingDone: false,
  language: null,
  defaultScreen: null,
};

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
    // localStorage unavailable — silently ignore
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

export const preferencesService = {
  getPrefs,
  savePrefs,
  getLanguage,
  setLanguage,
  getDefaultScreen,
  setDefaultScreen,
  isOnboardingDone,
  markOnboardingDone,
};
