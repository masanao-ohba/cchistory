'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Project {
  id: string;
  display_name: string;
  path: string;
}

interface FilterState {
  startDate: string;
  endDate: string;
  projects: string[];
  sortOrder: 'asc' | 'desc';
}

interface QuickFilter {
  key: string;
  startDate: string;
  endDate: string;
}

interface UseFilterBarOptions {
  onFilterChange?: (filters: FilterState) => void;
  initialFilters?: Partial<FilterState>;
  allProjectsText?: string;
  projectsSelectedText?: (count: number) => string;
}

export function useFilterBar({
  onFilterChange,
  initialFilters = {},
  allProjectsText = 'All Projects',
  projectsSelectedText = (count) => `${count} projects selected`
}: UseFilterBarOptions = {}) {
  // Initial state
  const initialState: FilterState = {
    startDate: '',
    endDate: '',
    projects: [],
    sortOrder: 'desc',
    ...initialFilters,
  };

  // State
  const [filters, setFilters] = useState<FilterState>(initialState);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Refs to prevent infinite loops
  const isExternalUpdate = useRef(false);

  // Quick filters
  const quickFilters: QuickFilter[] = [
    {
      key: 'today',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    },
    {
      key: 'yesterday',
      startDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      endDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    },
    {
      key: 'last7Days',
      startDate: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    },
    {
      key: 'last30Days',
      startDate: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    },
  ];

  // Watch for filter changes and emit
  useEffect(() => {
    if (!isInitialized || isExternalUpdate.current) {
      return;
    }

    onFilterChange?.(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, isInitialized]);

  // Set filter state from external source (e.g., URL)
  const setFilterState = useCallback((newState: Partial<FilterState>) => {
    isExternalUpdate.current = true;

    setFilters((prev) => ({
      ...prev,
      ...(newState.startDate !== undefined && { startDate: newState.startDate || '' }),
      ...(newState.endDate !== undefined && { endDate: newState.endDate || '' }),
      ...(newState.projects !== undefined && {
        projects: Array.isArray(newState.projects) ? [...newState.projects] : [],
      }),
      ...(newState.sortOrder !== undefined && { sortOrder: newState.sortOrder || 'desc' }),
    }));

    // Reset flag after state update
    setTimeout(() => {
      isExternalUpdate.current = false;
    }, 0);
  }, []);

  // Update individual filter fields
  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setFilters(initialState);
  }, [initialState]);

  // Apply quick filter
  const applyQuickFilter = useCallback((quickFilter: QuickFilter) => {
    setFilters((prev) => ({
      ...prev,
      startDate: quickFilter.startDate,
      endDate: quickFilter.endDate,
    }));
  }, []);

  // Toggle all projects
  const toggleAllProjects = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      projects: prev.projects.length === 0 ? projects.map((p) => p.id) : [],
    }));
  }, [projects]);

  // Remove project
  const removeProject = useCallback((projectId: string) => {
    setFilters((prev) => ({
      ...prev,
      projects: prev.projects.filter((id) => id !== projectId),
    }));
  }, []);

  // Toggle dropdown
  const toggleDropdown = useCallback(() => {
    setIsDropdownOpen((prev) => !prev);
  }, []);

  // Close dropdown
  const closeDropdown = useCallback(() => {
    setIsDropdownOpen(false);
  }, []);

  // Mark as initialized
  const markAsInitialized = useCallback(() => {
    setIsInitialized(true);
  }, []);

  // Get selected projects text
  const getSelectedProjectsText = useCallback(() => {
    if (filters.projects.length === 0) {
      return allProjectsText;
    }
    if (filters.projects.length === 1) {
      const project = projects.find((p) => p.id === filters.projects[0]);
      return project ? project.display_name : 'Unknown';
    }
    return projectsSelectedText(filters.projects.length);
  }, [filters.projects, projects, allProjectsText, projectsSelectedText]);

  // Get selected projects details
  const getSelectedProjectsDetails = useCallback(() => {
    return projects.filter((p) => filters.projects.includes(p.id));
  }, [filters.projects, projects]);

  return {
    filters,
    projects,
    isDropdownOpen,
    isInitialized,
    quickFilters,
    setProjects,
    updateFilter,
    setFilterState,
    clearAllFilters,
    applyQuickFilter,
    toggleAllProjects,
    removeProject,
    toggleDropdown,
    closeDropdown,
    markAsInitialized,
    getSelectedProjectsText,
    getSelectedProjectsDetails,
  };
}
