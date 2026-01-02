'use client';

import { memo, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { CalendarIcon, ArrowUpIcon, ArrowDownIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface InlineFilterBarProps {
  startDate: string;
  endDate: string;
  sortOrder: 'asc' | 'desc';
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  onReset: () => void;
  compact?: boolean;
  keyword?: string;
  activeProjectTab?: string;
}

const InlineFilterBar = memo(function InlineFilterBar({
  startDate,
  endDate,
  sortOrder,
  onStartDateChange,
  onEndDateChange,
  onSortOrderChange,
  onReset,
  compact = false,
  keyword = '',
  activeProjectTab = 'all',
}: InlineFilterBarProps) {
  const t = useTranslations('filters');

  // Convert string dates to Date objects for DatePicker
  const startDateObj = useMemo(() => {
    return startDate ? new Date(startDate) : null;
  }, [startDate]);

  const endDateObj = useMemo(() => {
    return endDate ? new Date(endDate) : null;
  }, [endDate]);

  // Handle date changes
  const handleStartDateChange = useCallback((date: Date | null) => {
    if (date) {
      const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      onStartDateChange(localDate.toISOString().split('T')[0]);
    } else {
      onStartDateChange('');
    }
  }, [onStartDateChange]);

  const handleEndDateChange = useCallback((date: Date | null) => {
    if (date) {
      const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      onEndDateChange(localDate.toISOString().split('T')[0]);
    } else {
      onEndDateChange('');
    }
  }, [onEndDateChange]);

  // Check if any filters are active - Simplified for debugging
  const hasActiveFilters = true; // Always show for debugging

  // Debug logging
  console.log('InlineFilterBar - Debug:', {
    startDate,
    endDate,
    sortOrder,
    keyword,
    activeProjectTab,
    compact,
    hasActiveFilters: true
  });

  // Toggle sort order
  const handleSortToggle = useCallback(() => {
    onSortOrderChange(sortOrder === 'desc' ? 'asc' : 'desc');
  }, [sortOrder, onSortOrderChange]);

  // Render compact version with proper flex container
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {/* Date Range Picker - Compact */}
        <div className="flex items-center gap-1 bg-white rounded-md border border-gray-300 px-2 py-1">
          <CalendarIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
          <div className="flex items-center gap-0.5">
            <DatePicker
              selected={startDateObj}
              onChange={handleStartDateChange}
              selectsStart
              startDate={startDateObj}
              endDate={endDateObj}
              dateFormat="MM/dd"
              placeholderText="From"
              className="w-16 text-xs border-none outline-none focus:ring-0 p-0 bg-transparent placeholder:text-gray-400"
              isClearable
              autoComplete="off"
            />
            <span className="text-gray-400 text-xs">-</span>
            <DatePicker
              selected={endDateObj}
              onChange={handleEndDateChange}
              selectsEnd
              startDate={startDateObj}
              endDate={endDateObj}
              minDate={startDateObj || undefined}
              dateFormat="MM/dd"
              placeholderText="To"
              className="w-16 text-xs border-none outline-none focus:ring-0 p-0 bg-transparent placeholder:text-gray-400"
              isClearable
              autoComplete="off"
            />
          </div>
        </div>

        {/* Sort Order Toggle - Icon only in compact mode */}
        <button
          onClick={handleSortToggle}
          className="p-1.5 bg-white rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
          title={t(sortOrder === 'desc' ? 'sortNewestFirst' : 'sortOldestFirst')}
        >
          {sortOrder === 'desc' ? (
            <ArrowDownIcon className="h-4 w-4 text-gray-600" />
          ) : (
            <ArrowUpIcon className="h-4 w-4 text-gray-600" />
          )}
        </button>

        {/* Reset Button - Icon only in compact mode */}
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="p-1.5 bg-red-50 rounded-md border border-red-200 hover:bg-red-100 transition-colors"
            title={t('resetFilters')}
          >
            <XMarkIcon className="h-4 w-4 text-red-600" />
          </button>
        )}
      </div>
    );
  }

  // Original full-width version
  return (
    <div className="border-b border-gray-200 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Picker - Combined Start and End */}
          <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-300 px-3 py-1.5">
            <CalendarIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <div className="flex items-center gap-1">
              <DatePicker
                selected={startDateObj}
                onChange={handleStartDateChange}
                selectsStart
                startDate={startDateObj}
                endDate={endDateObj}
                dateFormat="yyyy-MM-dd"
                placeholderText={t('startDate')}
                className="w-24 text-sm border-none outline-none focus:ring-0 p-0 bg-transparent"
                isClearable
                autoComplete="off"
              />
              <span className="text-gray-400">-</span>
              <DatePicker
                selected={endDateObj}
                onChange={handleEndDateChange}
                selectsEnd
                startDate={startDateObj}
                endDate={endDateObj}
                minDate={startDateObj || undefined}
                dateFormat="yyyy-MM-dd"
                placeholderText={t('endDate')}
                className="w-24 text-sm border-none outline-none focus:ring-0 p-0 bg-transparent"
                isClearable
                autoComplete="off"
              />
            </div>
          </div>

          {/* Sort Order Toggle */}
          <button
            onClick={handleSortToggle}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-sm"
            title={t(sortOrder === 'desc' ? 'sortNewestFirst' : 'sortOldestFirst')}
          >
            {sortOrder === 'desc' ? (
              <ArrowDownIcon className="h-4 w-4" />
            ) : (
              <ArrowUpIcon className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {t(sortOrder === 'desc' ? 'newestFirst' : 'oldestFirst')}
            </span>
          </button>

          {/* Reset Button - Only show if filters are active */}
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg border border-red-200 hover:bg-red-100 transition-colors text-sm"
              title={t('resetFilters')}
            >
              <XMarkIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{t('reset')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default InlineFilterBar;