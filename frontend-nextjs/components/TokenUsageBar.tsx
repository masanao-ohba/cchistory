/**
 * TokenUsageBar Component (API-only fast mode)
 *
 * Displays Claude Code usage from Anthropic OAuth API:
 * - 5-hour session utilization
 * - 7-day weekly utilization
 *
 * Features:
 * - Shows percentage used with progress bars
 * - Displays reset times in local timezone
 * - Auto-refreshes based on configured interval
 * - Fast loading (no JSONL parsing)
 */
'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useTokenUsage } from '@/lib/hooks/useTokenUsage';
import { liveIndicatorDot, cn } from '@/lib/styles';
import type { FormattedUsageMetric } from '@/lib/types/tokenUsage';
import {
  WarningIcon,
  LightningBoltIcon,
  RefreshIcon,
  SpinnerIcon,
} from './icons';

interface TokenUsageBarProps {
  compact?: boolean;
}

export default function TokenUsageBar({ compact = false }: TokenUsageBarProps) {
  const t = useTranslations('tokenUsage');
  const locale = useLocale();
  const { tokenUsage, isLoading, error, refreshOAuthToken } = useTokenUsage(true);
  const [isClient, setIsClient] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // Set client-side flag to avoid hydration mismatch with time formatting
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle refresh button click
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshError(null);
    const result = await refreshOAuthToken();
    setIsRefreshing(false);
    if (!result.success) {
      setRefreshError(result.error || 'Refresh failed');
    }
  };

  // Show error message with refresh button
  if (error) {
    return (
      <div className="py-2 px-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/30 border-b border-red-100 dark:border-red-800">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 text-red-500 dark:text-red-400">
            <WarningIcon />
          </div>
          <div className="flex-1 text-xs text-red-700 dark:text-red-300">
            {t('title')}: {refreshError || error}
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex-shrink-0 px-3 py-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500 disabled:bg-red-300 dark:disabled:bg-red-800 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
          >
            {isRefreshing ? (
              <>
                <SpinnerIcon className="w-3 h-3 animate-spin" />
                {t('refreshing') || 'Refreshing...'}
              </>
            ) : (
              <>
                <RefreshIcon className="w-3 h-3" />
                {t('refresh') || 'Refresh'}
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading || !tokenUsage) {
    return (
      <div className="py-2 px-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border-b border-indigo-100 dark:border-indigo-800">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 text-indigo-400 dark:text-indigo-300 animate-pulse">
            <LightningBoltIcon />
          </div>
          <div className="flex-1 text-xs text-gray-500 dark:text-gray-400">{t('loading')}</div>
        </div>
      </div>
    );
  }

  // Format time remaining
  const formatTimeRemaining = (minutes: number): string => {
    const safeMinutes = Math.max(0, minutes || 0);
    const days = Math.floor(safeMinutes / (60 * 24));
    const hours = Math.floor((safeMinutes % (60 * 24)) / 60);
    const mins = Math.floor(safeMinutes % 60);

    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Format reset time in local timezone (rounded to hour)
  const formatResetTime = (date: Date): string => {
    const rounded = new Date(date);
    if (rounded.getMinutes() >= 30) {
      rounded.setHours(rounded.getHours() + 1);
    }
    rounded.setMinutes(0);
    rounded.setSeconds(0);
    rounded.setMilliseconds(0);

    // Format based on locale
    const options: Intl.DateTimeFormatOptions = {
      month: locale === 'en' ? 'short' : 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };

    const localeMap: Record<string, string> = {
      ja: 'ja-JP',
      zh: 'zh-CN',
      ko: 'ko-KR',
      en: 'en-US',
    };

    return rounded.toLocaleString(localeMap[locale] || 'en-US', options);
  };

  // Get progress bar color based on percentage
  const getProgressColor = (percentage: number): string => {
    if (percentage < 50) return 'bg-blue-500 dark:bg-blue-400';
    if (percentage < 75) return 'bg-indigo-500 dark:bg-indigo-400';
    if (percentage < 90) return 'bg-orange-500 dark:bg-orange-400';
    return 'bg-red-500 dark:bg-red-400';
  };

  // Render a single usage metric row
  const renderMetricRow = (label: string, metric: FormattedUsageMetric) => {
    const percentage = Math.min(metric.utilization, 100);
    const color = getProgressColor(percentage);

    return (
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Label */}
        <div className="w-16 sm:w-20 text-xs text-gray-700 dark:text-gray-300 font-medium flex-shrink-0 flex items-center gap-1">
          {label}
          <span className={cn(liveIndicatorDot, 'w-1 h-1 animate-none')} title="Live data" />
        </div>

        {/* Progress bar */}
        <div className="flex-1 min-w-0">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${color} transition-all duration-300`}
              style={{ width: `${percentage}%` }}
              title={`${percentage.toFixed(1)}% used`}
            />
          </div>
        </div>

        {/* Percentage */}
        <div className="flex-shrink-0 text-xs font-semibold text-gray-800 dark:text-gray-200 w-10 text-right">
          {percentage.toFixed(0)}%
        </div>

        {/* Reset time */}
        <div className="flex-shrink-0 text-xs text-gray-600 dark:text-gray-400 w-20 sm:w-28 text-right truncate">
          {isClient ? formatResetTime(metric.resetsAt) : '--:--'}
        </div>
      </div>
    );
  };

  // Render mini progress bar (continuous bar style)
  const renderMiniProgressBar = (percentage: number) => {
    const color = getProgressColor(percentage);
    const clampedPercentage = Math.min(Math.max(percentage, 0), 100);

    return (
      <div className="w-12 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-300`}
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>
    );
  };

  // Render compact metric (inline with mini progress bar)
  const renderCompactMetric = (label: string, metric: FormattedUsageMetric) => {
    const percentage = Math.min(metric.utilization, 100);

    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{label}</span>
        {renderMiniProgressBar(percentage)}
        <span className="text-xs font-bold text-gray-800 dark:text-gray-200 w-8">{percentage.toFixed(0)}%</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">↻{formatTimeRemaining(metric.timeRemainingMinutes)}</span>
      </div>
    );
  };

  if (compact) {
    // Compact mode: Show both 5-hour and 7-day in single line with mini progress bars
    return (
      <div className="py-2 px-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border-b border-indigo-100 dark:border-indigo-800">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 text-indigo-600 dark:text-indigo-400">
            <LightningBoltIcon />
          </div>

          {/* Both metrics in one line */}
          <div className="flex-1 flex items-center gap-4">
            {/* 5-hour metric */}
            {renderCompactMetric(t('session'), tokenUsage.currentSession)}

            {/* Separator */}
            <span className="text-gray-300 dark:text-gray-600">│</span>

            {/* 7-day metric */}
            {renderCompactMetric(t('weekly'), tokenUsage.weekly)}

            {/* Live indicator */}
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <span className={cn(liveIndicatorDot, 'w-1.5 h-1.5')} />
              <span className="hidden sm:inline">Live</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Full mode: Show both metrics
  return (
    <div className="py-3 px-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border-b border-indigo-100 dark:border-indigo-800">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 mt-1 text-indigo-600 dark:text-indigo-400">
          <LightningBoltIcon className="w-5 h-5" />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              {t('title')}
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                <span className={cn(liveIndicatorDot, 'w-1.5 h-1.5')} />
                <span className="hidden sm:inline">Live</span>
              </span>
            </h3>
          </div>

          {/* Usage metrics */}
          <div className="space-y-2">
            {renderMetricRow(t('session'), tokenUsage.currentSession)}
            {renderMetricRow(t('weekly'), tokenUsage.weekly)}
          </div>
        </div>
      </div>
    </div>
  );
}
