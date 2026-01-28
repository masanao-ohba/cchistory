import { cn } from './cn';

interface TabButtonOptions {
  isSelected: boolean;
  isLoading?: boolean;
  isAllTab?: boolean;
}

/**
 * Tab button styles for ProjectTabs component
 */
export function tabButtonStyles({ isSelected, isLoading = false, isAllTab = false }: TabButtonOptions): string {
  const base = cn(
    'flex items-center gap-2 px-4 py-3',
    'text-sm font-medium whitespace-nowrap',
    'transition-all duration-200',
    'min-w-[100px]',
    'border-b-2',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-1 dark:focus:ring-offset-gray-900'
  );

  const selectedStyles = isSelected
    ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
    : cn(
        'text-gray-600 dark:text-gray-400 border-transparent',
        'hover:text-gray-800 dark:hover:text-gray-200',
        'hover:bg-gray-50 dark:hover:bg-gray-800'
      );

  const loadingStyles = isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  const allTabStyles = isAllTab ? 'font-semibold' : '';

  return cn(base, selectedStyles, loadingStyles, allTabStyles);
}

/**
 * Tab badge/count styles
 */
export function tabBadgeStyles(isSelected: boolean): string {
  const base = 'inline-flex items-center justify-center px-2 py-0.5 text-xs rounded-full';

  if (isSelected) {
    return cn(base, 'bg-blue-600 dark:bg-blue-500 text-white');
  }

  return cn(base, 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300');
}

/**
 * Dropdown menu item styles
 */
export function dropdownItemStyles(isSelected: boolean): string {
  const base = cn(
    'w-full px-4 py-2 text-left text-sm',
    'flex items-center justify-between gap-4',
    'transition-colors duration-150',
    'cursor-pointer'
  );

  if (isSelected) {
    return cn(
      base,
      'bg-blue-50 dark:bg-blue-900/30',
      'text-blue-700 dark:text-blue-300 font-medium'
    );
  }

  return cn(
    base,
    'text-gray-700 dark:text-gray-300',
    'hover:bg-gray-100 dark:hover:bg-gray-700'
  );
}

/**
 * New message indicator pulse
 */
export const newMessageIndicator = cn(
  'w-2 h-2 rounded-full animate-pulse',
  'bg-red-500 dark:bg-red-400'
);

/**
 * Unread count badge styles
 */
export const unreadBadge = cn(
  'absolute -top-1 -right-1',
  'min-w-[18px] h-[18px]',
  'flex items-center justify-center',
  'text-xs font-bold text-white',
  'bg-red-500 dark:bg-red-600',
  'rounded-full'
);

/**
 * Status badge styles - for notification types, etc.
 */
export function statusBadgeStyles(color: 'yellow' | 'blue' | 'green' | 'red' | 'gray'): string {
  const base = 'text-xs px-2 py-1 rounded-full';
  const colors = {
    yellow: cn(base, 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'),
    blue: cn(base, 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'),
    green: cn(base, 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200'),
    red: cn(base, 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200'),
    gray: cn(base, 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'),
  };
  return colors[color];
}

/**
 * Unread dot indicator
 */
export const unreadDot = cn(
  'w-2 h-2 rounded-full',
  'bg-blue-500 dark:bg-blue-400'
);

/**
 * Live indicator dot (green pulsing)
 */
export const liveIndicatorDot = cn(
  'w-2 h-2 rounded-full animate-pulse',
  'bg-green-500 dark:bg-green-400'
);
