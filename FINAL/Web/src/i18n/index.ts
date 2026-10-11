import { dashboardTranslations } from '@/locales/dashboardTranslations';
import { loginTranslations } from '@/locales/loginTranslations';
import { workerTranslations } from '@/locales/workerTranslations';
import { portalTranslations } from '@/locales/portalTranslations';
import { uiTranslations } from '@/locales/uiTranslations';
import { roleTranslations } from '@/locales/roleTranslations';
import { DEFAULT_LANGUAGE, isLanguage, locales, type Language } from './config';

export { DEFAULT_LANGUAGE, getLocale, isLanguage, locales, type Language } from './config';

/**
 * The single public i18n API. Keep page code dependent on this module rather
 * than on an individual feature dictionary, so a language switch behaves the
 * same before and after sign-in.
 */
export const LANGUAGE_STORAGE_KEY = 'bss-lang';
export const LANGUAGE_COOKIE_NAME = 'bss-lang';

type Dictionary = Record<string, Record<string, string>>;
const dictionaries: readonly Dictionary[] = [loginTranslations, dashboardTranslations, workerTranslations, portalTranslations, uiTranslations, roleTranslations];

function dictionaryFor(language: Language): Record<string, string> {
  return Object.assign({}, ...dictionaries.map((dictionary) => dictionary[language] ?? {}));
}

const englishDictionary = dictionaryFor(DEFAULT_LANGUAGE);

export function translate(language: Language, key: string, values?: Record<string, string | number>): string {
  let message = dictionaryFor(language)[key] ?? englishDictionary[key] ?? key;
  if (values) {
    message = message.replace(/\{(\w+)\}/g, (placeholder, name) => String(values[name] ?? placeholder));
  }
  return message;
}

/**
 * Every curated value for a language. Used by the runtime auto-translator to
 * skip strings that are already human-curated (so it never re-translates a
 * correct dictionary translation).
 */
export function dictionaryValuesFor(language: Language): Set<string> {
  return new Set(Object.values(dictionaryFor(language)));
}

export function getStoredLanguage(value: string | null | undefined): Language {
  return value && isLanguage(value) ? value : DEFAULT_LANGUAGE;
}

export function persistLanguage(language: Language): void {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  // A readable cookie lets the root layout use the same locale on the next
  // request, eliminating the language reset/flash on every page navigation.
  document.cookie = `${LANGUAGE_COOKIE_NAME}=${language}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

/**
 * Fails fast when a locale has no feature dictionary. Individual missing keys
 * intentionally use the central English fallback; this lets features ship
 * translations independently without one feature overwriting another with
 * copied English values.
 */
export function validateTranslations(): void {
  const missing = locales.flatMap(({ code }) => dictionaries.flatMap((dictionary, index) => {
    const localeDictionary = dictionary[code];
    if (!localeDictionary) return [`${code} (dictionary ${index + 1})`];
    return [];
  }));
  if (missing.length) throw new Error(`Missing translation dictionaries: ${missing.join(', ')}`);
}
