import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Project {
  id: string;
  display_name: string;
  path: string;
}

interface Filters {
  startDate: string | null;
  endDate: string | null;
  keyword: string;
  showRelatedThreads: boolean;
  sortOrder: 'asc' | 'desc';
  threadMode: 'timeline' | 'grouped';
  offset: number;
  limit: number;
}

interface ConversationState {
  currentFilters: Filters;
  projects: Project[];
  activeProjectTab: string | 'all';
  setFilters: (filters: Partial<Filters>) => void;
  setProjects: (projects: Project[]) => void;
  setActiveProjectTab: (tab: string | 'all') => void;
  resetFilters: () => void;
}

const initialFilters: Filters = {
  startDate: null,
  endDate: null,
  keyword: '',
  showRelatedThreads: true,  // Show entire thread when keyword matches
  sortOrder: 'desc',
  threadMode: 'grouped',
  offset: 0,
  limit: 15,
};

export const useConversationStore = create<ConversationState>()(
  persist(
    (set) => ({
      currentFilters: initialFilters,
      projects: [],
      activeProjectTab: 'all',
      setFilters: (filters) =>
        set((state) => ({
          currentFilters: { ...state.currentFilters, ...filters },
        })),
      setProjects: (projects) => set({ projects }),
      setActiveProjectTab: (tab) => set({ activeProjectTab: tab }),
      resetFilters: () => set({ currentFilters: initialFilters }),
    }),
    {
      name: 'conversation-storage',
      version: 2, // Bump version to clear old stored keyword
      // Exclude keyword from persistence - it's a temporary search state
      partialize: (state) => ({
        currentFilters: {
          ...state.currentFilters,
          keyword: '',  // Don't persist keyword
        },
      }),
      // Migration: clear keyword from old storage versions
      migrate: (persistedState: any, version: number) => {
        if (version < 2 && persistedState?.currentFilters) {
          persistedState.currentFilters.keyword = '';
          persistedState.currentFilters.showRelatedThreads = true;
        }
        return persistedState;
      },
    }
  )
);
