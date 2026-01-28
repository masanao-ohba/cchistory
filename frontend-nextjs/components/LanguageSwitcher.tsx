/**
 * LanguageSwitcher Component
 *
 * Language switcher with hover popup menu.
 * Shows current language and displays all options on hover.
 */
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { locales, type Locale } from '@/i18n/request';
import { dropdownItemStyles, popupCard, cn, languageSwitcherButton } from '@/lib/styles';
import { GlobeIcon } from '@/components/icons';

export default function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Language labels for display
  const languageLabels: Record<Locale, { short: string; full: string }> = {
    en: { short: 'EN', full: 'English' },
    ja: { short: 'JA', full: '日本語' },
    zh: { short: 'ZH', full: '中文' },
    ko: { short: 'KO', full: '한국어' },
  };

  // Debounced hover handler to prevent flickering
  const handleMouseEnter = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setIsOpen(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      hideTimeoutRef.current = null;
    }, 150);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const handleLanguageChange = (newLocale: Locale) => {
    if (newLocale === locale) {
      setIsOpen(false);
      return;
    }

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

    setIsOpen(false);
    router.push(newPath);
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Current language button */}
      <button
        className={languageSwitcherButton}
        aria-label="Change language"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <GlobeIcon className="w-3.5 h-3.5" />
        <span className="font-semibold uppercase">{languageLabels[locale].short}</span>
      </button>

      {/* Popup menu */}
      <div
        className={cn(
          popupCard,
          'absolute bottom-full right-0 mb-1 transition-all duration-200',
          isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-1'
        )}
        role="menu"
        aria-orientation="vertical"
      >
        {locales.map((loc) => (
          <button
            key={loc}
            onClick={() => handleLanguageChange(loc)}
            className={dropdownItemStyles(loc === locale)}
            role="menuitem"
          >
            <span>{languageLabels[loc].full}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 uppercase">{languageLabels[loc].short}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
