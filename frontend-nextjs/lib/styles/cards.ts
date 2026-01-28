import { cn } from './cn';

interface MessageContainerOptions {
  isHighlighted?: boolean;
  contentOnly?: boolean;
}

/**
 * Message container styles - supports both full card and content-only modes
 */
export function messageContainerStyles({ isHighlighted = false, contentOnly = false }: MessageContainerOptions): string {
  if (contentOnly) {
    // GitHub PR style: just the content box
    const base = 'relative bg-gray-50 dark:bg-gray-800 border rounded-md transition-all duration-200';
    const highlight = isHighlighted
      ? 'border-blue-400 dark:border-blue-500 shadow-md ring-2 ring-blue-200 dark:ring-blue-800 z-50'
      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600';
    return cn(base, highlight);
  }

  // Original style with full card
  const base = 'relative flex bg-white dark:bg-gray-900 border rounded-lg transition-all duration-200';
  const highlight = isHighlighted
    ? 'border-blue-500 dark:border-blue-400 shadow-lg ring-2 ring-blue-300 dark:ring-blue-700 z-50'
    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm';
  return cn(base, highlight);
}

/**
 * Side indicator bar styles for messages
 */
export function indicatorStyles(isUser: boolean): string {
  const base = 'w-1 self-stretch rounded-l-lg flex-shrink-0';
  const color = isUser ? 'bg-blue-500 dark:bg-blue-400' : 'bg-gray-300 dark:bg-gray-600';
  return cn(base, color);
}

/**
 * Conversation card container styles
 */
export const conversationCard = cn(
  'bg-white dark:bg-gray-900 rounded-lg border transition-all',
  'border-gray-200 dark:border-gray-700',
  'hover:border-gray-300 dark:hover:border-gray-600'
);

/**
 * Popup/dropdown card styles
 */
export const popupCard = cn(
  'bg-white dark:bg-gray-800 rounded-md shadow-lg dark:shadow-xl',
  'border border-gray-200 dark:border-gray-600',
  'overflow-hidden'
);

/**
 * Session continuation indicator styles
 */
export const continuationIndicator = cn(
  'mb-4 px-3 py-2 rounded-md',
  'bg-blue-50 dark:bg-blue-900/30',
  'border border-blue-200 dark:border-blue-800'
);

/**
 * Date picker container styles
 */
export const datePickerContainer = cn(
  'flex items-center gap-1 rounded-lg border px-3 py-1.5',
  'bg-white dark:bg-gray-800',
  'border-gray-300 dark:border-gray-600'
);

/**
 * Compact date picker container styles
 */
export const datePickerContainerCompact = cn(
  'flex items-center gap-1 rounded-md border px-2 py-1',
  'bg-white dark:bg-gray-800',
  'border-gray-300 dark:border-gray-600'
);

/**
 * Search input styles - supports compact mode
 */
export function searchInputStyles(compact: boolean = false): string {
  const base = cn(
    'w-full rounded-lg transition-colors',
    'bg-gray-50 dark:bg-gray-800',
    'border border-gray-200 dark:border-gray-700',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400',
    'focus:border-blue-500 dark:focus:border-blue-400',
    'focus:bg-white dark:focus:bg-gray-900',
    'text-gray-900 dark:text-gray-100',
    'placeholder:text-gray-400 dark:placeholder:text-gray-500'
  );

  if (compact) {
    return cn(base, 'pl-8 pr-8 py-1.5 text-sm');
  }
  return cn(base, 'pl-10 pr-10 py-2');
}

/**
 * Notification item container styles
 */
export function notificationItemStyles(isUnread: boolean): string {
  const base = cn(
    'relative border-b border-gray-100 dark:border-gray-700',
    'hover:bg-gray-50 dark:hover:bg-gray-700',
    'cursor-pointer transition-colors duration-150'
  );

  if (isUnread) {
    return cn(base, 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800');
  }
  return cn(base, 'bg-white dark:bg-gray-800');
}

/**
 * Notification details panel styles
 */
export const notificationDetailsPanel = cn(
  'p-3 rounded-lg border',
  'bg-gray-50 dark:bg-gray-700',
  'border-gray-200 dark:border-gray-600'
);

/**
 * Notification unread indicator bar
 */
export const unreadIndicatorBar = cn(
  'absolute left-0 top-0 bottom-0 w-1',
  'bg-gradient-to-b from-blue-500 to-blue-700 dark:from-blue-400 dark:to-blue-600'
);

/**
 * Checkbox label container styles
 */
export function checkboxLabelStyles(compact: boolean = false): string {
  const base = cn(
    'inline-flex items-center cursor-pointer',
    'text-gray-600 dark:text-gray-300',
    'bg-white dark:bg-gray-800',
    'px-2 py-1 rounded border',
    'border-gray-300 dark:border-gray-600',
    'hover:bg-gray-50 dark:hover:bg-gray-700'
  );
  return cn(base, compact ? 'text-[11px]' : 'text-xs');
}
