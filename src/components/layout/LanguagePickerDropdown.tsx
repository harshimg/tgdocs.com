import React, { useState, useRef, useEffect } from 'react';
import { languages, defaultLang, type SupportedLanguage } from '../../i18n/ui';
import { Check } from 'lucide-react';

interface LanguagePickerDropdownProps {
  variant?: 'header' | 'login' | 'custom';
  className?: string;
}

export const LanguagePickerDropdown: React.FC<LanguagePickerDropdownProps> = ({
  variant = 'header',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect current language from window.location
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(defaultLang);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const segments = window.location.pathname.split('/').filter(Boolean);
      const candidate = segments[0] as SupportedLanguage;
      if (candidate && candidate in languages) {
        setCurrentLang(candidate);
      } else {
        setCurrentLang(defaultLang);
      }
    }
  }, []);

  // Handle outside clicks
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getTargetUrl = (targetLang: SupportedLanguage): string => {
    if (typeof window === 'undefined') return '/app';
    const pathname = window.location.pathname;
    const segments = pathname.split('/').filter(Boolean);

    let currentRoute = '';
    if (segments.length > 0 && segments[0] in languages) {
      currentRoute = segments.slice(1).join('/');
    } else {
      currentRoute = segments.join('/');
    }

    let targetPath = '';
    if (targetLang === defaultLang) {
      targetPath = currentRoute ? `/${currentRoute}` : '/';
    } else {
      targetPath = currentRoute ? `/${targetLang}/${currentRoute}` : `/${targetLang}`;
    }

    return `${targetPath}${window.location.search}${window.location.hash}`;
  };

  const handleSelect = (langKey: SupportedLanguage) => {
    setIsOpen(false);
    if (langKey === currentLang) return;
    try {
      localStorage.setItem('tgdocs_lang', langKey);
    } catch {
      // Ignore storage errors
    }
    window.location.href = getTargetUrl(langKey);
  };

  // Button styles based on variant
  const buttonStyle =
    variant === 'login'
      ? 'p-2 rounded-xl border border-[#2e3236] bg-[#212427]/80 hover:bg-[#2c3035] text-[#8e9299] hover:text-white transition-all duration-150 cursor-pointer shadow-sm flex items-center justify-center backdrop-blur-xs'
      : 'p-2 sm:p-2.5 rounded-full hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[#444746] dark:text-[#c4c7c5] hover:text-[#0b57d0] dark:hover:text-[#a8c7fa] transition cursor-pointer flex items-center justify-center';

  const iconStyle =
    variant === 'login'
      ? 'w-4 h-4'
      : 'w-4 h-4 sm:w-5 sm:h-5';

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      {/* Trigger Button showing only the 文A translate symbol */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select Language"
        title="Select Language"
        aria-expanded={isOpen}
        className={buttonStyle}
      >
        <svg
          className={iconStyle}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m5 8 6 6" />
          <path d="m4 14 6-6 2-3" />
          <path d="M2 5h12" />
          <path d="M7 2h1" />
          <path d="m22 22-5-10-5 10" />
          <path d="M14 18h6" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white dark:bg-[#1e1f20] border border-[#e0e3e7] dark:border-[#3c4043] shadow-xl shadow-black/10 dark:shadow-black/50 py-1.5 z-50 focus:outline-none backdrop-blur-md animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#747775] dark:text-[#8e918f] border-b border-[#e0e3e7]/60 dark:border-[#3c4043]/60 mb-1">
            Languages
          </div>

          <div className="max-h-64 overflow-y-auto overscroll-contain py-0.5">
            {(Object.entries(languages) as [SupportedLanguage, string][]).map(([langKey, label]) => {
              const isActive = langKey === currentLang;
              return (
                <button
                  key={langKey}
                  type="button"
                  onClick={() => handleSelect(langKey)}
                  className={`w-[calc(100%-0.5rem)] mx-1 flex items-center justify-between px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer text-left ${
                    isActive
                      ? 'bg-[#0b57d0]/10 text-[#0b57d0] dark:bg-[#a8c7fa]/20 dark:text-[#a8c7fa] font-bold'
                      : 'text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-[10px] font-mono uppercase text-[#747775] dark:text-[#8e918f]">
                      {langKey}
                    </span>
                    <span className="truncate">{label}</span>
                  </div>
                  {isActive && <Check className="w-3.5 h-3.5 text-[#0b57d0] dark:text-[#a8c7fa] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
