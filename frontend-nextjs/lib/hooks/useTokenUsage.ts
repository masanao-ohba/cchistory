/**
 * React Query hook for Claude Code token usage data with auto-refresh
 * Supports three usage metrics matching official Claude Code status
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
 * Format a single usage metric into UI-friendly data
 * Uses corrected values for display (Claude Code estimated) when available
 */
const formatUsageMetric = (metric: UsageMetric): FormattedUsageMetric => {
  // Use corrected percentage for display (Claude Code estimated), fallback to raw
  const displayPercentage = metric.corrected?.percentage ?? metric.percentage_used;

  return {
    totalTokens: metric.usage.total_tokens,
    inputTokens: metric.usage.input_tokens,
    outputTokens: metric.usage.output_tokens,
    cacheCreationTokens: metric.usage.cache_creation_tokens,
    cacheReadTokens: metric.usage.cache_read_tokens,
    startTime: new Date(metric.start_time),
    endTime: new Date(metric.end_time),
    timeRemainingMinutes: metric.time_remaining_minutes,
    limitTokens: metric.limit_tokens,
    limitHoursSonnet: metric.limit_hours_sonnet,
    limitHoursOpus: metric.limit_hours_opus,
    limitNote: metric.limit_note,
    percentageUsed: displayPercentage,  // Corrected value for display
    entries: metric.entries,
    // Hybrid display: keep raw values for transparency
    rawTokens: metric.raw?.tokens,
    rawPercentage: metric.raw?.percentage ?? metric.percentage_used,
    correctionFactor: metric.corrected?.factor,
  };
};

/**
 * Format raw token usage response into UI-friendly data
 */
const formatTokenUsage = (data: TokenUsageResponse): FormattedTokenUsage | null => {
  if (!data.available || !data.current_session || !data.weekly_all || !data.weekly_sonnet) {
    return null;
  }

  return {
    planType: data.plan_type || 'unknown',
    limits: data.limits!,
    currentSession: formatUsageMetric(data.current_session),
    weeklyAll: formatUsageMetric(data.weekly_all),
    weeklySonnet: formatUsageMetric(data.weekly_sonnet),
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

  return {
    ...query,
    tokenUsage: formattedData,
    rawData: query.data,
    error: query.data?.error || (query.error as Error)?.message || null,
  };
};
