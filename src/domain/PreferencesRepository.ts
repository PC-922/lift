export type ScreenType = 'home' | 'insights' | 'workout' | 'routines' | 'settings';

export type AuthMode = 'google' | 'guest' | null;

export interface Prefs {
  onboardingDone: boolean;
  language: 'es' | 'en' | null;
  defaultScreen: ScreenType | null;
  authMode: AuthMode;
  lastUid: string | null;
}

export interface PreferencesRepository {
  getPrefs(): Prefs;
  savePrefs(partial: Partial<Prefs>): void;
  getLanguage(): 'es' | 'en' | null;
  setLanguage(lang: 'es' | 'en'): void;
  getDefaultScreen(): ScreenType | null;
  setDefaultScreen(screen: ScreenType): void;
  isOnboardingDone(): boolean;
  markOnboardingDone(): void;
  getLastUid(): string | null;
  setLastUid(uid: string | null): void;
  subscribe(listener: () => void): () => void;
}
