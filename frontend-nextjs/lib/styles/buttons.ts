import { cn } from './cn';

/**
 * Copy button styles - changes color based on copied state
 */
export function copyButtonStyles(isCopied: boolean): string {
  const base = 'p-1.5 rounded transition-colors duration-200 cursor-pointer';

  if (isCopied) {
    return cn(base, 'text-green-600 dark:text-green-400');
  }

  return cn(
    base,
    'text-gray-400 dark:text-gray-500',
    'hover:text-gray-600 dark:hover:text-gray-300',
    'hover:bg-gray-100 dark:hover:bg-gray-800'
  );
}

/**
 * Toggle button styles - user vs assistant color scheme
 */
export function toggleButtonStyles(isUser: boolean): string {
  const base = 'mt-2 text-sm font-medium hover:underline cursor-pointer';

  if (isUser) {
    return cn(
      base,
      'text-blue-600 dark:text-blue-400',
      'hover:text-blue-800 dark:hover:text-blue-300'
    );
  }

  return cn(
    base,
    'text-gray-600 dark:text-gray-400',
    'hover:text-gray-800 dark:hover:text-gray-300'
  );
}

/**
 * Icon button base styles
 */
export const iconButton = cn(
  'p-1.5 rounded-md border transition-colors cursor-pointer',
  'bg-white dark:bg-gray-800',
  'border-gray-300 dark:border-gray-600',
  'hover:bg-gray-50 dark:hover:bg-gray-700'
);

/**
 * Reset/danger button styles
 */
export const resetButton = cn(
  'p-1.5 rounded-md border transition-colors cursor-pointer',
  'bg-red-50 dark:bg-red-900/30',
  'border-red-200 dark:border-red-800',
  'hover:bg-red-100 dark:hover:bg-red-900/50',
  'text-red-600 dark:text-red-400'
);

/**
 * Primary action button styles
 */
export const primaryButton = cn(
  'px-4 py-2 rounded-md font-medium transition-colors cursor-pointer',
  'bg-blue-500 text-white',
  'hover:bg-blue-600',
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
);

/**
 * Sort toggle button styles
 */
export const sortToggleButton = cn(
  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors cursor-pointer',
  'bg-white dark:bg-gray-800',
  'border-gray-300 dark:border-gray-600',
  'hover:bg-gray-50 dark:hover:bg-gray-700',
  'text-gray-900 dark:text-gray-100'
);

/**
 * Full reset button with text
 */
export const resetButtonFull = cn(
  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors cursor-pointer',
  'bg-red-50 dark:bg-red-900/30',
  'text-red-600 dark:text-red-400',
  'border-red-200 dark:border-red-800',
  'hover:bg-red-100 dark:hover:bg-red-900/50'
);

/**
 * Language switcher button styles
 */
export const languageSwitcherButton = cn(
  'inline-flex items-center gap-1',
  'px-2.5 py-1.5',
  'text-sm font-medium',
  'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white',
  'bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700',
  'transition-all duration-200',
  'cursor-pointer',
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-gray-900',
  'rounded-md',
  'border border-gray-300 dark:border-gray-600',
  'shadow-sm dark:shadow-none'
);

/**
 * Text link button styles - for inline action buttons
 */
export function textLinkButtonStyles(color: 'blue' | 'purple' | 'red' | 'gray' = 'blue'): string {
  const base = 'text-xs cursor-pointer transition-colors';
  const colors = {
    blue: 'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300',
    purple: 'text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300',
    red: 'text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300',
    gray: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
  };
  return cn(base, colors[color]);
}

/**
 * Icon action button (for notification actions, etc.)
 */
export const iconActionButton = cn(
  'p-1 rounded transition-colors cursor-pointer',
  'text-gray-500 dark:text-gray-400',
  'hover:text-gray-700 dark:hover:text-gray-200',
  'hover:bg-gray-100 dark:hover:bg-gray-700'
);

/**
 * Danger icon button (delete, etc.)
 */
export const dangerIconButton = cn(
  'p-2 rounded-lg transition-colors cursor-pointer',
  'text-gray-400 dark:text-gray-500',
  'hover:text-red-500 dark:hover:text-red-400',
  'hover:bg-red-50 dark:hover:bg-red-900/30'
);
