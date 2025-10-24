/**
 * FilterPanel Component
 *
 * Collapsible filter panel with auto-apply functionality.
 * Contains date range, project selection, and sort order controls.
 */
'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

export interface FilterPanelProps {
  isExpanded: boolean;
  startDate: string;
  endDate: string;
  selectedProjects: string[];
  availableProjects: string[];
  sortOrder: 'asc' | 'desc';
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onProjectsChange: (projects: string[]) => void;
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  onReset: () => void;
}

export default function FilterPanel({
  isExpanded,
  startDate,
  endDate,
  selectedProjects,
  availableProjects,
  sortOrder,
  onStartDateChange,
  onEndDateChange,
  onProjectsChange,
  onSortOrderChange,
  onReset,
}: FilterPanelProps) {
  const tDate = useTranslations('dateFilter');
  const tProject = useTranslations('projectFilter');
  const tSort = useTranslations('sortOrder');
  const tFilters = useTranslations('filters');

  // Track if date input is focused to prevent auto-fill on mobile
  const startDateFocusedRef = React.useRef(false);
  const endDateFocusedRef = React.useRef(false);

  // Handle project selection change
  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, (option) => option.value);
    onProjectsChange(selectedOptions);
  };

  // Handle start date change with mobile auto-fill prevention
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Only apply if user has actually interacted (not just focused)
    if (startDateFocusedRef.current || newValue === '') {
      onStartDateChange(newValue);
    }
  };

  // Handle end date change with mobile auto-fill prevention
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Only apply if user has actually interacted (not just focused)
    if (endDateFocusedRef.current || newValue === '') {
      onEndDateChange(newValue);
    }
  };

  // Check if any filters are active
  const hasActiveFilters =
    startDate !== '' || endDate !== '' || selectedProjects.length > 0;

  // Don't render at all if not expanded (better for mobile/iPad)
  if (!isExpanded) {
    return null;
  }

  return (
    <div
      className="animate-fadeIn"
      role="region"
      aria-label="Filter options"
    >
      <div className="px-4 py-4 bg-white border-b border-gray-200">
        {/* Filter Grid - Simple vertical layout */}
        <div className="space-y-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {tDate('title')}
            </label>
            <div className="flex gap-3">
              {/* Start Date with Clear Button */}
              <div className="flex-1 relative">
                {/* Label that appears as placeholder when empty */}
                {!startDate && (
                  <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                    <span className="text-sm text-gray-400">{tDate('from')}</span>
                  </div>
                )}
                <input
                  type="date"
                  value={startDate}
                  onChange={handleStartDateChange}
                  onClick={() => {
                    startDateFocusedRef.current = true;
                  }}
                  onBlur={() => {
                    // Reset flag after a small delay
                    setTimeout(() => {
                      startDateFocusedRef.current = false;
                    }, 100);
                  }}
                  className="
                    w-full px-3 py-2 text-sm text-gray-900
                    border border-gray-300 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    bg-white
                  "
                  aria-label={tDate('from')}
                />
                {startDate && (
                  <button
                    type="button"
                    onClick={() => onStartDateChange('')}
                    className="
                      absolute right-2 top-1/2 -translate-y-1/2
                      w-5 h-5 flex items-center justify-center
                      text-gray-400 hover:text-gray-600
                      rounded-full hover:bg-gray-100
                      transition-colors
                    "
                    aria-label="Clear start date"
                  >
                    ×
                  </button>
                )}
              </div>

              <span className="flex items-center text-gray-500">→</span>

              {/* End Date with Clear Button */}
              <div className="flex-1 relative">
                {/* Label that appears as placeholder when empty */}
                {!endDate && (
                  <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                    <span className="text-sm text-gray-400">{tDate('to')}</span>
                  </div>
                )}
                <input
                  type="date"
                  value={endDate}
                  onChange={handleEndDateChange}
                  onClick={() => {
                    endDateFocusedRef.current = true;
                  }}
                  onBlur={() => {
                    // Reset flag after a small delay
                    setTimeout(() => {
                      endDateFocusedRef.current = false;
                    }, 100);
                  }}
                  className="
                    w-full px-3 py-2 text-sm text-gray-900
                    border border-gray-300 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    bg-white
                  "
                  aria-label={tDate('to')}
                />
                {endDate && (
                  <button
                    type="button"
                    onClick={() => onEndDateChange('')}
                    className="
                      absolute right-2 top-1/2 -translate-y-1/2
                      w-5 h-5 flex items-center justify-center
                      text-gray-400 hover:text-gray-600
                      rounded-full hover:bg-gray-100
                      transition-colors
                    "
                    aria-label="Clear end date"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Project Selection & Sort Order - Horizontal layout */}
          <div className="flex gap-6">
            {/* Project Selection */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                {tProject('projects')}
              </label>
              <select
                multiple
                value={selectedProjects}
                onChange={handleProjectChange}
                className="
                  w-full px-3 py-2 text-sm text-gray-900
                  border border-gray-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  bg-white
                  h-[100px]
                "
                aria-label={tProject('projects')}
              >
                {availableProjects
                  .filter((project) => typeof project === 'string' && project.trim() !== '')
                  .map((project) => (
                    <option key={project} value={project} className="text-gray-900 py-1">
                      {project}
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Hold Cmd/Ctrl to select multiple
              </p>
            </div>

            {/* Sort Order */}
            <div className="flex-shrink-0">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                {tSort('label')}
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="sortOrder"
                    value="desc"
                    checked={sortOrder === 'desc'}
                    onChange={(e) => onSortOrderChange(e.target.value as 'desc')}
                    className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-900">{tSort('descending')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="sortOrder"
                    value="asc"
                    checked={sortOrder === 'asc'}
                    onChange={(e) => onSortOrderChange(e.target.value as 'asc')}
                    className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-900">{tSort('ascending')}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Filter Actions */}
          {hasActiveFilters && (
            <div className="flex justify-end pt-2 border-t border-gray-200">
              <button
                onClick={onReset}
                className="
                  px-4 py-2 text-sm font-medium
                  text-gray-700 bg-white
                  border border-gray-300 rounded-lg
                  hover:bg-gray-50 hover:border-gray-400
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                  transition-colors
                "
              >
                {tFilters('reset')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
