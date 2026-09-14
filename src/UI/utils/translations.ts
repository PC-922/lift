import { useSyncExternalStore } from 'react';
import { useOptionalApplicationServices } from '../ApplicationProvider';

import { translations } from '../messages';
export { translations } from '../messages';

export const getLanguage = (): 'es' | 'en' => {
  if (typeof navigator === 'undefined') return 'es';
  const lang = navigator.language.split('-')[0];
  return lang === 'es' ? 'es' : 'en';
};

export const useLanguage = (): 'es' | 'en' => {
  const preferences = useOptionalApplicationServices()?.preferences;
  const fallback = getLanguage;
  return useSyncExternalStore(
    preferences?.subscribe ?? (() => () => undefined),
    () => preferences?.getLanguage() ?? fallback(),
    fallback
  );
};

export const useTranslations = () => {
  const language = useLanguage();
  return translations[language];
};

export const t = translations[getLanguage()];

export function getTranslatedGroupName(group: string, language = getLanguage()): string {
  const translated = translations.es.muscleGroups as Record<string, string>;
  return translated[group]
    ? (translations[language].muscleGroups as Record<string, string>)[group]
    : group;
}
