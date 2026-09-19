import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { languages, defaultLang, type SupportedLanguage } from './ui';
import { appStrings, type AppStringKey } from './app-strings';

interface I18nContextType {
  lang: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: AppStringKey) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: defaultLang,
  setLanguage: () => {},
  t: (key) => appStrings.en[key] || key,
});

export function detectLanguageFromUrl(): SupportedLanguage {
  if (typeof window === 'undefined') return defaultLang;
  const segments = window.location.pathname.split('/').filter(Boolean);
  const candidate = segments[0] as SupportedLanguage;
  if (candidate && candidate in languages) {
    return candidate;
  }
  try {
    const stored = localStorage.getItem('tgdocs_lang') as SupportedLanguage;
    if (stored && stored in languages) {
      return stored;
    }
  } catch {
    // Ignore storage restrictions
  }
  return defaultLang;
}

interface I18nProviderProps {
  children: React.ReactNode;
  initialLang?: SupportedLanguage;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children, initialLang }) => {
  const [lang, setLang] = useState<SupportedLanguage>(() => {
    if (initialLang && initialLang in languages) {
      return initialLang;
    }
    return detectLanguageFromUrl();
  });

  useEffect(() => {
    if (initialLang && initialLang in languages) {
      setLang(initialLang);
      try {
        localStorage.setItem('tgdocs_lang', initialLang);
      } catch {}
    } else {
      const detected = detectLanguageFromUrl();
      setLang(detected);
      if (typeof window !== 'undefined' && window.location.pathname === '/app' && detected !== defaultLang) {
        try {
          window.history.replaceState({}, '', `/${detected}/app${window.location.search}${window.location.hash}`);
        } catch {}
      }
    }
  }, [initialLang]);

  // Keep <html> lang attribute updated
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  // Listen to popstate for browser back/forward navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      setLang(detectLanguageFromUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const setLanguage = useCallback((newLang: SupportedLanguage) => {
    if (!newLang || !(newLang in languages)) return;
    setLang(newLang);
    try {
      localStorage.setItem('tgdocs_lang', newLang);
    } catch {
      // Ignore localStorage restrictions
    }
  }, []);

  const t = useCallback(
    (key: AppStringKey): string => {
      const currentDict = appStrings[lang];
      if (currentDict && currentDict[key]) {
        return currentDict[key];
      }
      return appStrings.en[key] || (key as string);
    },
    [lang]
  );

  const value = useMemo(
    () => ({
      lang,
      setLanguage,
      t,
    }),
    [lang, setLanguage, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useTranslation() {
  return useContext(I18nContext);
}
