/**
 * FilterToggle Component
 *
 * Toggle button for showing/hiding the filter panel.
 * Displays active state indicator when filters are applied.
 */
'use client';

import { useTranslations } from 'next-intl';

interface FilterToggleProps {
  isExpanded: boolean;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  onToggle: () => void;
}

export default function FilterToggle({
  isExpanded,
  hasActiveFilters,
  activeFilterCount,
  onToggle,
}: FilterToggleProps) {
  const t = useTranslations('filters');

  return (
    <button
      onClick={onToggle}
      className={`
        relative flex items-center justify-center
        w-10 h-10 rounded-lg
        transition-all duration-200
        ${
          isExpanded || hasActiveFilters
            ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            : 'bg-white text-gray-600 hover:bg-gray-100'
        }
        border border-gray-200
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        cursor-pointer
      `}
      aria-label={isExpanded ? t('hideFilters') : t('showFilters')}
      aria-expanded={isExpanded}
      title={
        hasActiveFilters
          ? t('filtersActive', { count: activeFilterCount })
          : t('toggleFilters')
      }
    >
      {/* Filter icon */}
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
          d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
        />
      </svg>

      {/* Active filter indicator badge */}
      {hasActiveFilters && (
        <span
          className="
            absolute -top-1 -right-1
            flex items-center justify-center
            min-w-[18px] h-[18px] px-1
            text-[10px] font-bold text-white
            bg-blue-600 rounded-full
            shadow-sm
          "
          aria-label={t('activeFilterCount', { count: activeFilterCount })}
        >
          {activeFilterCount}
        </span>
      )}
    </button>
  );
}
