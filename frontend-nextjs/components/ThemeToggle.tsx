/**
 * ThemeToggle Component
 *
 * Toggle switch for light/dark mode.
 * Uses sun icon for light mode, moon icon for dark mode.
 */
'use client';

import { useState, useEffect } from 'react';
import { useThemeStore, getEffectiveTheme } from '@/lib/stores/themeStore';

interface IconProps {
  className?: string;
}

function SunIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function MoonIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  );
}

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate effective theme (resolves 'system' to actual light/dark)
  const effectiveTheme = mounted ? getEffectiveTheme(theme) : 'light';
  const isDark = effectiveTheme === 'dark';

  // Don't render anything until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="fixed bottom-4 right-4 z-[60] w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="
        fixed bottom-4 right-4 z-[60]
        inline-flex items-center justify-center
        w-10 h-10
        text-gray-600 hover:text-gray-900
        dark:text-gray-400 dark:hover:text-gray-100
        bg-white hover:bg-gray-50
        dark:bg-gray-800 dark:hover:bg-gray-700
        transition-all duration-200
        cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        dark:focus:ring-offset-gray-900
        rounded-full
        border border-gray-300
        dark:border-gray-600
        shadow-sm
      "
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <SunIcon className="w-5 h-5" />
      ) : (
        <MoonIcon className="w-5 h-5" />
      )}
    </button>
  );
}
