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
import { type Locale } from '@/i18n';

const languageNames: Record<Locale, string> = {
  en: 'English',
  ja: '日本語',
};

const languageFlags: Record<Locale, string> = {
  en: '🇺🇸',
  ja: '🇯🇵',
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
        `}
        aria-label="Settings"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Settings/Gear Icon */}
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
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
