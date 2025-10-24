/**
 * React Query hook for Claude Code token usage data with auto-refresh
 */
'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchTokenUsage } from '../api/client';
import type { TokenUsageResponse, FormattedTokenUsage } from '../types/tokenUsage';

// Default refresh interval: 30 seconds (configurable via env)
const DEFAULT_REFRESH_INTERVAL = 30000;

// Get refresh interval from environment or use default
const getRefreshInterval = (): number => {
  if (typeof window === 'undefined') return DEFAULT_REFRESH_INTERVAL;

  const envInterval = process.env.NEXT_PUBLIC_TOKEN_USAGE_REFRESH_INTERVAL;
  if (envInterval) {
    const parsed = parseInt(envInterval, 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : DEFAULT_REFRESH_INTERVAL;
  }

  return DEFAULT_REFRESH_INTERVAL;
};

/**
 * Format raw token usage response into UI-friendly data
 */
const formatTokenUsage = (data: TokenUsageResponse): FormattedTokenUsage | null => {
  if (!data.available || !data.current_block) {
    return null;
  }

  const block = data.current_block;

  return {
    totalTokens: block.total_tokens,
    inputTokens: block.token_counts.input_tokens,
    outputTokens: block.token_counts.output_tokens,
    cacheCreationTokens: block.token_counts.cache_creation_tokens,
    cacheReadTokens: block.token_counts.cache_read_tokens,
    blockStartTime: new Date(block.start_time),
    blockEndTime: new Date(block.end_time),
    timeRemainingMinutes: block.time_remaining_minutes,
    entries: block.entries,
    isActive: block.is_active,
  };
};

/**
 * Hook to fetch and manage token usage data with automatic polling
 *
 * @param enabled - Whether to enable the query (default: true)
 * @param initialData - Initial token usage data from server (optional)
 * @returns Query result with formatted token usage data
 */
export const useTokenUsage = (enabled: boolean = true, initialData?: TokenUsageResponse) => {
  const refreshInterval = getRefreshInterval();

  const query = useQuery({
    queryKey: ['tokenUsage'],
    queryFn: fetchTokenUsage,
    enabled,
    refetchInterval: refreshInterval,
    refetchIntervalInBackground: false, // Only refetch when tab is active
    staleTime: refreshInterval - 1000, // Data considered stale just before next refetch
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Use initialData from server if provided
    initialData: initialData,
    initialDataUpdatedAt: initialData ? Date.now() : undefined,
  });

  // Format the data for easier consumption
  const formattedData = query.data ? formatTokenUsage(query.data) : null;

  return {
    ...query,
    tokenUsage: formattedData,
    rawData: query.data,
    error: query.data?.error || (query.error as Error)?.message || null,
  };
};
