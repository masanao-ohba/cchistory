import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface Message {
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  search_keyword?: string;
  is_search_match?: boolean;
  session_id?: string;
  uuid?: string;
  project?: {
    id: string;
    display_name: string;
    path: string;
  };
}

// Note: The API returns conversations as Message[][] (array of message arrays)
// not as Conversation[] with separate messages property
export interface ConversationsResponse {
  conversations: Message[][];  // Array of message groups (threads)
  total_threads: number;
  total_messages: number;
  actual_threads: number;
  actual_messages: number;
  search_match_count?: number;
  stats: {
    total_threads: number;
    total_messages: number;
    projects: number;
    daily_thread_counts: Record<string, number>;
  };
}

export interface ConversationsFilters {
  startDate?: string | null;
  endDate?: string | null;
  projects?: string[];
  keyword?: string;
  showRelatedThreads?: boolean;
  sortOrder?: 'asc' | 'desc';
  threadMode?: 'timeline' | 'grouped';
  offset?: number;
  limit?: number;
}

export function useConversations(
  filters: ConversationsFilters = {},
  enabled: boolean = true
): UseQueryResult<ConversationsResponse> {
  return useQuery({
    queryKey: ['conversations', filters],
    queryFn: async () => {
      const params: Record<string, any> = {};

      if (filters.startDate) params.start_date = filters.startDate;
      if (filters.endDate) params.end_date = filters.endDate;
      if (filters.projects && filters.projects.length > 0) {
        filters.projects.forEach((project) => {
          if (!params['project[]']) params['project[]'] = [];
          params['project[]'].push(project);
        });
      }
      if (filters.keyword) params.keyword = filters.keyword;
      if (filters.showRelatedThreads !== undefined) {
        params.show_related_threads = filters.showRelatedThreads;
      }
      if (filters.sortOrder) params.sort_order = filters.sortOrder;
      if (filters.threadMode === 'grouped') params.group_by_thread = 'true';
      if (filters.offset !== undefined) params.offset = filters.offset;
      if (filters.limit !== undefined) params.limit = filters.limit;

      return apiClient.get<ConversationsResponse>('/conversations', params);
    },
    enabled,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });
}

export interface Project {
  id: string;
  display_name: string;
  path: string;
}

export function useProjects(): UseQueryResult<{ projects: Project[] }> {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.get<{ projects: Project[] }>('/projects'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useStats(filters: ConversationsFilters = {}): UseQueryResult<any> {
  return useQuery({
    queryKey: ['stats', filters],
    queryFn: () => {
      const params: Record<string, any> = {};

      if (filters.startDate) params.start_date = filters.startDate;
      if (filters.endDate) params.end_date = filters.endDate;
      if (filters.projects && filters.projects.length > 0) {
        filters.projects.forEach((project) => {
          if (!params['project[]']) params['project[]'] = [];
          params['project[]'].push(project);
        });
      }

      return apiClient.get('/conversations/stats', params);
    },
    staleTime: 60000,
  });
}
