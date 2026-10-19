"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEFAULT_LANGUAGE, getLocale, isLanguage, LANGUAGE_STORAGE_KEY, persistLanguage, translate, type Language, validateTranslations } from '@/i18n';
export type { Language } from '@/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
});

export const LanguageProvider = ({ children, initialLanguage = DEFAULT_LANGUAGE }: { children: React.ReactNode; initialLanguage?: Language }) => {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  useEffect(() => { validateTranslations(); }, []);

  useEffect(() => {
    const syncAcrossTabs = (event: StorageEvent) => {
    if (event.key === LANGUAGE_STORAGE_KEY && event.newValue && isLanguage(event.newValue)) setLanguageState(event.newValue);
    };
    window.addEventListener('storage', syncAcrossTabs);
    return () => window.removeEventListener('storage', syncAcrossTabs);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    persistLanguage(lang);
  };

  useEffect(() => {
    const locale = getLocale(language);
    document.documentElement.lang = locale.code;
    document.documentElement.dir = locale.dir;
  }, [language]);

  const t = (key: string) => translate(language, key);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
