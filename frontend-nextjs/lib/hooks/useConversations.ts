import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Message, Project } from '../types/message';
import { buildConversationParams } from '../utils/params';

export type { Message, Project };

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
      const params = buildConversationParams(filters);
      return apiClient.get<ConversationsResponse>('/conversations', params);
    },
    enabled,
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Allow initial fetch on mount for accurate loading state
    refetchOnReconnect: false,
    staleTime: 30 * 1000, // 30 seconds - balance between freshness and performance
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1, // Only retry once on failure
  });
}

export function useProjects(): UseQueryResult<{ projects: Project[] }> {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.get<{ projects: Project[] }>('/projects'),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStats(filters: ConversationsFilters = {}): UseQueryResult<any> {
  return useQuery({
    queryKey: ['stats', filters],
    queryFn: () => {
      const params = buildConversationParams(filters, { includeAllFields: false });
      return apiClient.get('/conversations/stats', params);
    },
    staleTime: 60000,
  });
}
