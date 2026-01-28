'use client';

import { memo, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { CalendarIcon, ArrowUpIcon, ArrowDownIcon, XMarkIcon } from '@/components/icons';
import { toLocalDateString } from '@/lib/utils/date';
import {
  iconButton,
  resetButton,
  sortToggleButton,
  resetButtonFull,
  datePickerContainer,
  datePickerContainerCompact,
} from '@/lib/styles';

interface InlineFilterBarProps {
  startDate: string;
  endDate: string;
  sortOrder: 'asc' | 'desc';
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  onReset: () => void;
  compact?: boolean;
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
    onStartDateChange(date ? toLocalDateString(date) : '');
  }, [onStartDateChange]);

  const handleEndDateChange = useCallback((date: Date | null) => {
    onEndDateChange(date ? toLocalDateString(date) : '');
  }, [onEndDateChange]);

  // Toggle sort order
  const handleSortToggle = useCallback(() => {
    onSortOrderChange(sortOrder === 'desc' ? 'asc' : 'desc');
  }, [sortOrder, onSortOrderChange]);

  // Render compact version with proper flex container
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {/* Date Range Picker - Compact */}
        <div className={datePickerContainerCompact}>
          <CalendarIcon className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <div className="flex items-center gap-0.5">
            <DatePicker
              selected={startDateObj}
              onChange={handleStartDateChange}
              selectsStart
              startDate={startDateObj}
              endDate={endDateObj}
              dateFormat="MM/dd"
              placeholderText="From"
              className="w-16 text-xs border-none outline-none focus:ring-0 p-0 bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              isClearable
              autoComplete="off"
            />
            <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>
            <DatePicker
              selected={endDateObj}
              onChange={handleEndDateChange}
              selectsEnd
              startDate={startDateObj}
              endDate={endDateObj}
              minDate={startDateObj || undefined}
              dateFormat="MM/dd"
              placeholderText="To"
              className="w-16 text-xs border-none outline-none focus:ring-0 p-0 bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              isClearable
              autoComplete="off"
            />
          </div>
        </div>

        {/* Sort Order Toggle - Icon only in compact mode */}
        <button
          onClick={handleSortToggle}
          className={iconButton}
          title={t(sortOrder === 'desc' ? 'sortNewestFirst' : 'sortOldestFirst')}
        >
          {sortOrder === 'desc' ? (
            <ArrowDownIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          ) : (
            <ArrowUpIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          )}
        </button>

        {/* Reset Button */}
        <button
          onClick={onReset}
          className={resetButton}
          title={t('resetFilters')}
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Original full-width version
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Picker - Combined Start and End */}
          <div className={datePickerContainer}>
            <CalendarIcon className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <div className="flex items-center gap-1">
              <DatePicker
                selected={startDateObj}
                onChange={handleStartDateChange}
                selectsStart
                startDate={startDateObj}
                endDate={endDateObj}
                dateFormat="yyyy-MM-dd"
                placeholderText={t('startDate')}
                className="w-24 text-sm border-none outline-none focus:ring-0 p-0 bg-transparent text-gray-900 dark:text-gray-100"
                isClearable
                autoComplete="off"
              />
              <span className="text-gray-400 dark:text-gray-500">-</span>
              <DatePicker
                selected={endDateObj}
                onChange={handleEndDateChange}
                selectsEnd
                startDate={startDateObj}
                endDate={endDateObj}
                minDate={startDateObj || undefined}
                dateFormat="yyyy-MM-dd"
                placeholderText={t('endDate')}
                className="w-24 text-sm border-none outline-none focus:ring-0 p-0 bg-transparent text-gray-900 dark:text-gray-100"
                isClearable
                autoComplete="off"
              />
            </div>
          </div>

          {/* Sort Order Toggle */}
          <button
            onClick={handleSortToggle}
            className={sortToggleButton}
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

          {/* Reset Button */}
          <button
            onClick={onReset}
            className={resetButtonFull}
            title={t('resetFilters')}
          >
            <XMarkIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{t('reset')}</span>
          </button>
        </div>
      </div>
    </div>
  );
});

export default InlineFilterBar;
