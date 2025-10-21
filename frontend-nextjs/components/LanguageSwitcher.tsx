'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { locales, type Locale } from '@/i18n/request';

export default function LanguageSwitcher() {
  const t = useTranslations('language');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Language names mapping
  const languageNames: Record<Locale, string> = {
    ja: t('japanese'),
    en: t('english'),
    zh: t('chinese'),
    ko: t('korean'),
  };

  // Language flags (using emoji)
  const languageFlags: Record<Locale, string> = {
    ja: '🇯🇵',
    en: '🇺🇸',
    zh: '🇨🇳',
    ko: '🇰🇷',
  };

  // Handle locale change
  const handleLocaleChange = (newLocale: Locale) => {
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('locale', newLocale);
    }

    // Build new path based on current pathname
    let newPath: string;

    // Check if pathname starts with a locale
    const startsWithLocale = locales.some(loc => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`));

    if (startsWithLocale) {
      // Replace existing locale with new locale
      const segments = pathname.split('/').filter(Boolean);
      segments[0] = newLocale;
      newPath = `/${segments.join('/')}`;
    } else {
      // Add locale to root path
      newPath = pathname === '/' ? `/${newLocale}` : `/${newLocale}${pathname}`;
    }

    router.push(newPath);
    setIsOpen(false);
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      {/* Current Language Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
        aria-label={t('switch')}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="text-lg">{languageFlags[locale as Locale]}</span>
        <span>{languageNames[locale as Locale]}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] overflow-hidden">
          {locales.map((loc) => (
            <button
              key={loc}
              onClick={() => handleLocaleChange(loc)}
              className={`w-full flex items-center space-x-3 px-4 py-3 text-sm hover:bg-gray-50 transition-colors ${
                locale === loc ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-700'
              }`}
              aria-current={locale === loc ? 'true' : undefined}
            >
              <span className="text-lg">{languageFlags[loc]}</span>
              <span className="flex-1 text-left">{languageNames[loc]}</span>
              {locale === loc && (
                <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
