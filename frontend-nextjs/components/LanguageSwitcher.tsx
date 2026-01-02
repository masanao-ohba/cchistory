/**
 * LanguageSwitcher Component
 *
 * Compact language switcher optimized for footer placement.
 * Shows current language code and cycles through available languages on click.
 */
'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { locales, type Locale } from '@/i18n/request';

export default function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  // Language labels for display
  const languageLabels: Record<Locale, string> = {
    en: 'EN',
    ja: 'JA',
    zh: 'ZH',
    ko: 'KO',
  };

  const handleLanguageChange = () => {
    // Cycle to next language
    const currentIndex = locales.indexOf(locale);
    const nextIndex = (currentIndex + 1) % locales.length;
    const newLocale = locales[nextIndex];

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
  };

  return (
    <button
      onClick={handleLanguageChange}
      className="
        inline-flex items-center gap-1
        px-2.5 py-1.5
        text-sm font-medium
        text-gray-600 hover:text-gray-900
        bg-white hover:bg-gray-50
        transition-all duration-200
        cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        rounded-md
        border border-gray-300
      "
      aria-label="Change language"
      title={`Language: ${languageLabels[locale]}. Click to change.`}
    >
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
        />
      </svg>
      <span className="font-semibold uppercase">{languageLabels[locale]}</span>
    </button>
  );
}
