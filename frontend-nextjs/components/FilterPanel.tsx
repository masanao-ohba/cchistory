/**
 * FilterPanel Component
 *
 * Collapsible filter panel with auto-apply functionality.
 * Contains date range, project selection, and sort order controls.
 */
'use client';

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

  // Handle project selection change
  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, (option) => option.value);
    onProjectsChange(selectedOptions);
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
              <input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="
                  flex-1 px-3 py-2 text-sm text-gray-900
                  border border-gray-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  bg-white
                "
                placeholder={tDate('fromPlaceholder')}
                aria-label={tDate('from')}
              />
              <span className="flex items-center text-gray-500">→</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                className="
                  flex-1 px-3 py-2 text-sm text-gray-900
                  border border-gray-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  bg-white
                "
                placeholder={tDate('toPlaceholder')}
                aria-label={tDate('to')}
              />
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
