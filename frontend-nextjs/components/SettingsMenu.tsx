/**
 * SettingsMenu Component
 *
 * Dropdown menu for application settings including language selection.
 * Replaces standalone language switcher for a cleaner header.
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { type Locale } from '@/i18n/request';

const languageNames: Record<Locale, string> = {
  en: 'English',
  ja: '日本語',
  zh: '中文',
  ko: '한국어',
};

const languageFlags: Record<Locale, string> = {
  en: '🇺🇸',
  ja: '🇯🇵',
  zh: '🇨🇳',
  ko: '🇰🇷',
};

export default function SettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close menu on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleLanguageChange = (newLocale: Locale) => {
    // Extract the path after the locale prefix
    const pathWithoutLocale = pathname.replace(`/${locale}`, '');
    const searchParams = new URLSearchParams(window.location.search);
    const queryString = searchParams.toString();

    // Construct new URL with new locale
    const newUrl = `/${newLocale}${pathWithoutLocale}${queryString ? `?${queryString}` : ''}`;

    router.push(newUrl);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Settings Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-center
          w-10 h-10 rounded-lg
          transition-all duration-200
          ${
            isOpen
              ? 'bg-gray-100 text-gray-700'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }
          border border-gray-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
          cursor-pointer
        `}
        aria-label="Language"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Colorized Globe Icon - Wireframe Style */}
        <svg
          className="w-6 h-6"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Dark background circle */}
          <circle cx="50" cy="50" r="48" fill="#2D3E50" />

          {/* Globe wireframe lines in cyan */}
          <g fill="none" stroke="#5DADE2" strokeWidth="3" strokeLinecap="round">
            {/* Vertical meridian lines */}
            <ellipse cx="50" cy="50" rx="38" ry="38" />
            <ellipse cx="50" cy="50" rx="28" ry="38" />
            <ellipse cx="50" cy="50" rx="18" ry="38" />
            <ellipse cx="50" cy="50" rx="8" ry="38" />

            {/* Horizontal latitude lines */}
            <line x1="12" y1="50" x2="88" y2="50" />
            <ellipse cx="50" cy="50" rx="38" ry="19" />
            <ellipse cx="50" cy="50" rx="38" ry="28" />
          </g>
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="
            absolute right-0 top-12
            w-56
            bg-white rounded-lg shadow-lg
            border border-gray-200
            overflow-hidden
            z-50
            animate-fadeIn
          "
          role="menu"
          aria-orientation="vertical"
        >
          {/* Language Section */}
          <div className="py-1">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Language
            </div>
            {Object.entries(languageNames).map(([code, name]) => {
              const isActive = locale === code;
              return (
                <button
                  key={code}
                  onClick={() => handleLanguageChange(code as Locale)}
                  className={`
                    w-full px-4 py-2.5
                    flex items-center justify-between
                    text-sm transition-colors
                    ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }
                    cursor-pointer
                  `}
                  role="menuitem"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-lg">{languageFlags[code as Locale]}</span>
                    <span className="font-medium">{name}</span>
                  </span>
                  {isActive && (
                    <svg
                      className="w-4 h-4 text-blue-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* Future: Additional settings sections can be added here */}
        </div>
      )}
    </div>
  );
}
