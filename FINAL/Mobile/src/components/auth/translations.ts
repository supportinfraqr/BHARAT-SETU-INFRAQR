/**
 * Compatibility bridge for auth components. All application translations live
 * in `src/locales` and are accessed through the public `@/i18n` module.
 */
import { getStoredLanguage, locales, translate } from '@/i18n';

export { locales as languages } from '@/i18n';

/** @deprecated Use `useLanguage().t` in components. */
export function getTranslation(language: string, key: string): string {
  return translate(getStoredLanguage(language), key);
}

/** @deprecated Import translations through `useLanguage` instead. */
export const translations = Object.fromEntries(
  locales.map(({ code }) => [code, new Proxy({}, { get: (_target, key) => translate(code, String(key)) })]),
) as Record<string, Record<string, string>>;
