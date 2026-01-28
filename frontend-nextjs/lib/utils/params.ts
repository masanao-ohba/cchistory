import { ConversationsFilters } from '../hooks/useConversations';

/**
 * Build API parameters from conversation filters
 * Handles common filter fields used across multiple endpoints
 */
export function buildConversationParams(
  filters: ConversationsFilters,
  options: { includeAllFields?: boolean } = {}
): Record<string, any> {
  const { includeAllFields = true } = options;
  const params: Record<string, any> = {};

  // Date filters
  if (filters.startDate) params.start_date = filters.startDate;
  if (filters.endDate) params.end_date = filters.endDate;

  // Project filters (array format)
  if (filters.projects && filters.projects.length > 0) {
    params['project[]'] = filters.projects;
  }

  // Additional fields only when includeAllFields is true
  if (includeAllFields) {
    if (filters.keyword) params.keyword = filters.keyword;
    if (filters.showRelatedThreads !== undefined) {
      params.show_related_threads = filters.showRelatedThreads;
    }
    if (filters.sortOrder) params.sort_order = filters.sortOrder;
    if (filters.threadMode === 'grouped') params.group_by_thread = 'true';
    if (filters.offset !== undefined) params.offset = filters.offset;
    if (filters.limit !== undefined) params.limit = filters.limit;
  }

  return params;
}

/**
 * Build URLSearchParams from an options object
 * Automatically converts values to strings and handles null/undefined
 */
export function buildSearchParams(
  options: Record<string, string | number | boolean | null | undefined>
): URLSearchParams {
  const params = new URLSearchParams();

  Object.entries(options).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      params.append(key, String(value));
    }
  });

  return params;
}
