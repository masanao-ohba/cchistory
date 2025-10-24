'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useFilterBar } from '@/lib/hooks/useFilterBar';

interface Project {
  id: string;
  display_name: string;
  path: string;
}

interface FilterBarProps {
  projects?: Project[];
  loading?: boolean;
  compact?: boolean;
  onFilterChange?: (filters: any) => void;
}

export default function FilterBar({
  projects: externalProjects = [],
  loading = false,
  compact = false,
  onFilterChange,
}: FilterBarProps) {
  const t = useTranslations();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    filters,
    projects,
    isDropdownOpen,
    quickFilters,
    setProjects,
    updateFilter,
    clearAllFilters,
    applyQuickFilter,
    toggleAllProjects,
    removeProject,
    toggleDropdown,
    closeDropdown,
    markAsInitialized,
    getSelectedProjectsText,
    getSelectedProjectsDetails,
  } = useFilterBar({
    onFilterChange,
    allProjectsText: t('projectFilter.allProjects'),
    projectsSelectedText: (count) => t('projectFilter.projectsSelected', { count }),
  });

  // Set projects when external projects change
  useEffect(() => {
    if (externalProjects.length > 0) {
      setProjects(externalProjects);
    }
  }, [externalProjects, setProjects]);

  // Mark as initialized immediately (don't wait for projects)
  useEffect(() => {
    markAsInitialized();
  }, [markAsInitialized]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [isDropdownOpen, closeDropdown]);

  const handleProjectToggle = useCallback(
    (projectId: string) => {
      const newProjects = filters.projects.includes(projectId)
        ? filters.projects.filter((id) => id !== projectId)
        : [...filters.projects, projectId];
      updateFilter('projects', newProjects);
    },
    [filters.projects, updateFilter]
  );

  const selectedProjectsText = getSelectedProjectsText();
  const selectedProjectsDetails = getSelectedProjectsDetails();

  // Input classes
  const inputClasses = compact
    ? 'px-2 py-1 text-sm h-8'
    : 'px-3 py-2 h-10';

  const baseInputClasses = 'w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none text-gray-900';

  return (
    <div
      className={`bg-white transition-all duration-300 ${
        compact ? 'p-2' : 'px-4 py-2 rounded-lg'
      }`}
    >
      {/* Main filter grid */}
      <div
        className={`grid grid-cols-1 gap-3 items-end ${
          compact ? 'md:grid-cols-7' : 'md:grid-cols-6'
        }`}
      >
        {/* Start Date */}
        <div>
          <input
            id="startDate"
            type="date"
            value={filters.startDate}
            onChange={(e) => updateFilter('startDate', e.target.value)}
            className={`${baseInputClasses} ${inputClasses}`}
            placeholder={t('dateFilter.fromPlaceholder')}
            aria-label={t('dateFilter.from')}
            title={t('dateFilter.from')}
          />
        </div>

        {/* End Date */}
        <div>
          <input
            id="endDate"
            type="date"
            value={filters.endDate}
            onChange={(e) => updateFilter('endDate', e.target.value)}
            className={`${baseInputClasses} ${inputClasses}`}
            placeholder={t('dateFilter.toPlaceholder')}
            aria-label={t('dateFilter.to')}
            title={t('dateFilter.to')}
          />
        </div>

        {/* Project Select */}
        <div className={compact ? 'md:col-span-2' : ''} ref={dropdownRef}>
          <div className="relative">
            <button
              type="button"
              onClick={toggleDropdown}
              className={`${baseInputClasses} ${inputClasses} bg-white text-left flex items-center justify-between`}
              aria-label={t('projectFilter.projects')}
              title={t('projectFilter.projects')}
            >
              <span className="truncate">{selectedProjectsText}</span>
              <svg
                className={`w-4 h-4 ml-2 transform transition-transform ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                <div className="p-2">
                  {/* All Projects checkbox */}
                  <label className="flex items-center p-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.projects.length === 0}
                      onChange={toggleAllProjects}
                      className="mr-2 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-900">{t('projectFilter.allProjects')}</span>
                  </label>
                  <hr className="my-1 border-gray-200" />

                  {/* Individual projects */}
                  {projects.map((project) => (
                    <label
                      key={project.id}
                      className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.projects.includes(project.id)}
                        onChange={() => handleProjectToggle(project.id)}
                        className="mr-2 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-900" title={project.path}>
                        {project.display_name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sort Order */}
        <div>
          <select
            id="sortOrder"
            value={filters.sortOrder}
            onChange={(e) => updateFilter('sortOrder', e.target.value as 'asc' | 'desc')}
            className={`${baseInputClasses} ${inputClasses} bg-white`}
            aria-label={t('sortOrder.label')}
            title={t('sortOrder.label')}
          >
            <option value="asc">{t('sortOrder.ascending')}</option>
            <option value="desc">{t('sortOrder.descending')}</option>
          </select>
        </div>

        {/* Reset Button */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={clearAllFilters}
            disabled={loading}
            className={`${inputClasses} bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center`}
          >
            {t('dateFilter.reset')}
          </button>
        </div>
      </div>

      {/* Selected Projects Tags */}
      {selectedProjectsDetails.length > 0 && !compact && (
        <div className="mt-4 flex flex-wrap gap-2">
          {selectedProjectsDetails.map((project) => (
            <span
              key={project.id}
              className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-md flex items-center"
            >
              {project.display_name}
              <button
                type="button"
                onClick={() => removeProject(project.id)}
                className="ml-2 text-primary-500 hover:text-primary-700"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 8.586L2.929 1.515 1.515 2.929 8.586 10l-7.071 7.071 1.414 1.414L10 11.414l7.071 7.071 1.414-1.414L11.414 10l7.071-7.071-1.414-1.414L10 8.586z" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
