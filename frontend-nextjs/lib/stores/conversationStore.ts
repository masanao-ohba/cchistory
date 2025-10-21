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
  projects: string[];
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
  setFilters: (filters: Partial<Filters>) => void;
  setProjects: (projects: Project[]) => void;
  resetFilters: () => void;
}

const initialFilters: Filters = {
  startDate: null,
  endDate: null,
  projects: [],
  keyword: '',
  showRelatedThreads: false,
  sortOrder: 'desc',
  threadMode: 'grouped',
  offset: 0,
  limit: 50,
};

export const useConversationStore = create<ConversationState>()(
  persist(
    (set) => ({
      currentFilters: initialFilters,
      projects: [],
      setFilters: (filters) =>
        set((state) => ({
          currentFilters: { ...state.currentFilters, ...filters },
        })),
      setProjects: (projects) => set({ projects }),
      resetFilters: () => set({ currentFilters: initialFilters }),
    }),
    {
      name: 'conversation-storage',
      partialize: (state) => ({ currentFilters: state.currentFilters }),
    }
  )
);
