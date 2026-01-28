import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

/**
 * Get the system's preferred color scheme.
 * Returns 'dark' if the user prefers dark mode, 'light' otherwise.
 */
const getSystemTheme = (): EffectiveTheme => {
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

/**
 * Resolve the effective theme, converting 'system' to the actual light/dark value.
 */
export const getEffectiveTheme = (theme: Theme): EffectiveTheme => {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',

      setTheme: (theme: Theme) => set({ theme }),

      toggleTheme: () => {
        const current = get().theme;
        const effectiveCurrent = getEffectiveTheme(current);
        // Toggle between light and dark (exit system mode on toggle)
        const next: Theme = effectiveCurrent === 'dark' ? 'light' : 'dark';
        set({ theme: next });
      },
    }),
    {
      name: 'theme',
    }
  )
);
