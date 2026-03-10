/**
 * React Query hook for Claude Code token usage data (API-only fast mode)
 * Fetches utilization percentages from Anthropic OAuth API
 */
'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchTokenUsage } from '../api/client';
import type { TokenUsageResponse, FormattedTokenUsage, FormattedUsageMetric, UsageMetric } from '../types/tokenUsage';

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
 * Calculate time remaining until reset
 */
const calculateTimeRemaining = (resetsAt: Date): number => {
  const now = new Date();
  const diffMs = resetsAt.getTime() - now.getTime();
  return Math.max(0, Math.floor(diffMs / 60000)); // minutes
};

/**
 * Format a single usage metric into UI-friendly data
 */
const formatUsageMetric = (metric: UsageMetric): FormattedUsageMetric => {
  const resetsAt = new Date(metric.resets_at);
  return {
    utilization: metric.utilization,
    resetsAt,
    timeRemainingMinutes: calculateTimeRemaining(resetsAt),
  };
};

/**
 * Format raw token usage response into UI-friendly data
 */
const formatTokenUsage = (data: TokenUsageResponse): FormattedTokenUsage | null => {
  if (!data.available || !data.current_session || !data.weekly) {
    return null;
  }

  return {
    currentSession: formatUsageMetric(data.current_session),
    weekly: formatUsageMetric(data.weekly),
  };
};

/**
 * Hook to fetch and manage token usage data with automatic polling
 *
 * @param enabled - Whether to enable the query (default: true)
 * @returns Query result with formatted token usage data
 */
export const useTokenUsage = (enabled: boolean = true) => {
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
  });

  // Format the data for easier consumption
  const formattedData = query.data ? formatTokenUsage(query.data) : null;

  // Function to refresh OAuth token and refetch data
  const refreshOAuthToken = async () => {
    try {
      // Step 1: Try to refresh OAuth token from Keychain (host-side server)
      const tokenResponse = await fetch('http://localhost:18081/refresh');
      await tokenResponse.json(); // Just ensure it completes, result not needed

      // Step 2: Always call backend to invalidate cache and refetch from Anthropic API
      const response = await fetch('/api/token-usage/refresh', { method: 'POST' });
      const result = await response.json();

      if (result.success) {
        // Invalidate React Query cache and refetch
        await query.refetch();
        return { success: true };
      }

      return {
        success: false,
        error: result.usage?.error || result.error || 'Failed to refresh token usage'
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to refresh token usage'
      };
    }
  };

  return {
    ...query,
    tokenUsage: formattedData,
    rawData: query.data,
    error: query.data?.error || (query.error as Error)?.message || null,
    refreshOAuthToken,
  };
};
