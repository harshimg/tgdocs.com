import { ui, languages, defaultLang, showDefaultLang, localeOgMap, type SupportedLanguage, type TranslationKey } from './ui';

export function getLangFromUrl(url: URL): SupportedLanguage {
  const segments = url.pathname.split('/').filter(Boolean);
  const candidate = segments[0] as SupportedLanguage;
  if (candidate && candidate in languages) {
    return candidate;
  }
  return defaultLang;
}

export function useTranslations(lang: SupportedLanguage) {
  return function t(key: TranslationKey): string {
    const langDict = ui[lang] as Record<string, string> | undefined;
    const defaultDict = ui[defaultLang] as Record<string, string>;
    return langDict?.[key] ?? defaultDict[key] ?? key;
  };
}

export function useTranslatedPath(lang: SupportedLanguage) {
  return function translatePath(path: string, targetLang: SupportedLanguage = lang): string {
    // Separate hash or search if present
    const hashIndex = path.indexOf('#');
    let hash = '';
    let purePath = path;
    if (hashIndex !== -1) {
      hash = purePath.slice(hashIndex);
      purePath = purePath.slice(0, hashIndex);
    }

    // Clean pure path
    let cleaned = purePath.trim();
    if (!cleaned.startsWith('/')) {
      cleaned = `/${cleaned}`;
    }

    // If pure path is just '/', normalize
    const isRoot = cleaned === '/' || cleaned === '';

    if (!showDefaultLang && targetLang === defaultLang) {
      return isRoot ? `/${hash}` : `${cleaned}${hash}`;
    }

    return isRoot ? `/${targetLang}/${hash}` : `/${targetLang}${cleaned}${hash}`;
  };
}

export function getRouteFromUrl(url: URL): string {
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length === 0) return '';
  if (segments[0] in languages) {
    return segments.slice(1).join('/');
  }
  return segments.join('/');
}

export interface HreflangItem {
  hreflang: string;
  href: string;
}

export function getHreflangList(pathname: string, siteUrl: string = 'https://tgdocs.com'): HreflangItem[] {
  // Strip existing locale prefix
  const segments = pathname.split('/').filter(Boolean);
  let routeSegments = segments;
  if (segments.length > 0 && segments[0] in languages) {
    routeSegments = segments.slice(1);
  }
  const cleanRoute = routeSegments.length > 0 ? `/${routeSegments.join('/')}` : '';

  const site = siteUrl.replace(/\/$/, '');

  const items: HreflangItem[] = [
    {
      hreflang: 'x-default',
      href: `${site}${cleanRoute || '/'}`,
    },
  ];

  (Object.keys(languages) as SupportedLanguage[]).forEach((lang) => {
    if (lang === defaultLang && !showDefaultLang) {
      items.push({
        hreflang: lang,
        href: `${site}${cleanRoute || '/'}`,
      });
    } else {
      items.push({
        hreflang: lang,
        href: `${site}/${lang}${cleanRoute}`,
      });
    }
  });

  return items;
}

export function getOgLocale(lang: SupportedLanguage): string {
  return localeOgMap[lang] || 'en_US';
}
