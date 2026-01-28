import { cn } from './cn';

/**
 * Base prose styles for markdown content
 */
export const proseBase = cn(
  'prose prose-sm max-w-none break-words overflow-x-auto',
  // Text colors
  'text-gray-700 dark:text-gray-300',
  'prose-headings:text-gray-900 dark:prose-headings:text-gray-100',
  'prose-p:text-gray-700 dark:prose-p:text-gray-300',
  // Code styles
  'prose-code:bg-gray-100 dark:prose-code:bg-gray-800',
  'prose-code:text-pink-600 dark:prose-code:text-pink-400',
  'prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono',
  // Pre/code block styles
  'prose-pre:bg-gray-900 dark:prose-pre:bg-gray-950 prose-pre:text-gray-100',
  // Table styles
  'prose-table:border-gray-200 dark:prose-table:border-gray-700',
  'prose-th:border-gray-200 dark:prose-th:border-gray-700',
  'prose-td:border-gray-200 dark:prose-td:border-gray-700',
  'prose-th:bg-gray-100 dark:prose-th:bg-gray-700',
  'prose-th:text-gray-900 dark:prose-th:text-gray-100 prose-th:font-semibold'
);

/**
 * Content styles with optional line clamping
 */
export function contentStyles(isExpanded: boolean): string {
  return cn(proseBase, !isExpanded && 'line-clamp-3');
}

/**
 * Avatar styles
 */
export function avatarStyles(isUser: boolean, size: 'sm' | 'md' = 'md'): string {
  const sizeClasses = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm';
  const colorClasses = isUser
    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';

  return cn(
    sizeClasses,
    'rounded-full flex items-center justify-center font-medium flex-shrink-0',
    colorClasses
  );
}

/**
 * Role label styles (User/Assistant)
 */
export function roleLabelStyles(isUser: boolean): string {
  return cn(
    'text-sm font-medium',
    isUser ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'
  );
}

/**
 * Timestamp styles
 */
export const timestampStyles = cn(
  'text-xs font-mono',
  'text-gray-400 dark:text-gray-500'
);
