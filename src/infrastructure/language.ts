import { localStoragePreferencesRepository } from './LocalStoragePreferencesRepository';
export const getLanguage = (): 'es' | 'en' => {
  try {
    const prefsLanguage = localStoragePreferencesRepository.getLanguage();
    if (prefsLanguage === 'es' || prefsLanguage === 'en') return prefsLanguage;
  } catch {
  }
  if (typeof navigator === 'undefined') return 'es';
  const lang = navigator.language.split('-')[0];
  return lang === 'es' ? 'es' : 'en';
};
