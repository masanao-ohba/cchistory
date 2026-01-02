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
  showRelatedThreads: false,
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
      partialize: (state) => ({ currentFilters: state.currentFilters }),
    }
  )
);
