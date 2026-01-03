/**
 * TokenUsageBar Component
 *
 * Displays Claude Code token usage matching official status display:
 * - Current session (5-hour block)
 * - Current week (all models)
 * - Current week (Opus)
 *
 * Features:
 * - Shows percentage used for each metric
 * - Displays reset times in local timezone
 * - Expandable details for token breakdown
 * - Auto-refreshes based on configured interval
 * - Right-aligned progress bars for consistent start position
 */
'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useTokenUsage } from '@/lib/hooks/useTokenUsage';
import type { FormattedUsageMetric } from '@/lib/types/tokenUsage';

interface TokenUsageBarProps {
  compact?: boolean;
}

export default function TokenUsageBar({ compact = false }: TokenUsageBarProps) {
  const t = useTranslations('tokenUsage');
  const locale = useLocale();
  const { tokenUsage, isLoading, error } = useTokenUsage(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Set client-side flag to avoid hydration mismatch with time formatting
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('[TokenUsageBar] State:', { isLoading, hasData: !!tokenUsage, error: !!error });
  }, [isLoading, tokenUsage, error]);

  // Don't render if error
  if (error) {
    return null;
  }

  // Show loading state
  if (isLoading || !tokenUsage) {
    return (
      <div className="py-2 px-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 text-indigo-400 animate-pulse">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="flex-1 text-xs text-gray-500">{t('loading')}</div>
        </div>
      </div>
    );
  }

  // Format tokens with K/M suffix
  const formatTokens = (tokens: number): string => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

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
    // Round to nearest hour as per official Claude Code display
    const rounded = new Date(date);
    if (rounded.getMinutes() >= 30) {
      rounded.setHours(rounded.getHours() + 1);
    }
    rounded.setMinutes(0);
    rounded.setSeconds(0);
    rounded.setMilliseconds(0);

    // Format based on locale
    if (locale === 'ja') {
      // Japanese format: "10月26日 12:00"
      return rounded.toLocaleString('ja-JP', {
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } else if (locale === 'zh') {
      // Chinese format: "10月26日 12:00"
      return rounded.toLocaleString('zh-CN', {
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } else if (locale === 'ko') {
      // Korean format: "10월 26일 12:00"
      return rounded.toLocaleString('ko-KR', {
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } else {
      // English format: "Oct 26, 12:00"
      return rounded.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }
  };

  // Get progress bar color based on percentage
  const getProgressColor = (percentage: number): string => {
    if (percentage < 50) return 'bg-blue-500';
    if (percentage < 75) return 'bg-indigo-500';
    if (percentage < 90) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Render a single usage metric row
  const renderMetricRow = (
    label: string,
    metric: FormattedUsageMetric,
    showTokens: boolean = false
  ) => {
    // Handle null percentageUsed (for hour-based weekly limits)
    const hasPercentage = metric.percentageUsed !== null;
    const percentage = hasPercentage ? Math.min(metric.percentageUsed!, 100) : 0;
    const color = getProgressColor(percentage);

    // Build tooltip based on limit type
    let tooltipText = '';
    if (metric.limitTokens) {
      tooltipText = `${percentage.toFixed(1)}% used of ${formatTokens(metric.limitTokens)} token limit`;
    } else if (metric.limitHoursSonnet) {
      tooltipText = `${formatTokens(metric.totalTokens)} tokens used. Weekly limit: ${metric.limitHoursSonnet} hours (Sonnet)`;
    }

    return (
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Label - responsive width */}
        <div className="w-20 sm:w-28 lg:w-32 text-xs text-gray-700 font-medium flex-shrink-0">
          {label}
        </div>

        {/* Progress bar - flexible width */}
        <div className="flex-1 min-w-0">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${color} transition-all duration-300`}
              style={{ width: hasPercentage ? `${percentage}%` : '0%' }}
              title={tooltipText}
            />
          </div>
        </div>

        {/* Percentage or info indicator */}
        <div className="flex-shrink-0 text-xs font-semibold text-gray-800 w-10 text-right">
          {hasPercentage ? `${percentage.toFixed(0)}%` : '-'}
        </div>

        {/* Token count (optional) - hide on small screens */}
        {showTokens && (
          <div className="hidden sm:block flex-shrink-0 text-xs text-gray-600 w-12 text-right">
            {formatTokens(metric.totalTokens)}
          </div>
        )}

        {/* Reset time - responsive width */}
        <div className="flex-shrink-0 text-xs text-gray-600 w-20 sm:w-24 lg:w-32 text-right truncate">
          {isClient ? formatResetTime(metric.endTime) : '--:--'}
        </div>
      </div>
    );
  };

  if (compact) {
    // Compact mode: Show only current session with expandable full view
    return (
      <div className="py-2 px-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
        <div className="flex items-center gap-3">
          {/* Token icon */}
          <div className="flex-shrink-0 text-indigo-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>

          {/* Current session info */}
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs text-gray-700">{t('session')}:</span>
            <span className="text-xs font-bold text-indigo-700">
              {tokenUsage.currentSession.percentageUsed !== null
                ? `${tokenUsage.currentSession.percentageUsed.toFixed(0)}%`
                : '-'}
            </span>
            <span className="text-xs text-gray-500">
              ↻ {formatTimeRemaining(tokenUsage.currentSession.timeRemainingMinutes)}
            </span>
          </div>

          {/* Expand button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0 text-indigo-600 hover:text-indigo-700 transition-colors"
            aria-label={isExpanded ? t('collapse') : t('expand')}
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Expanded full view */}
        {isExpanded && (
          <div className="mt-3 space-y-2">
            {renderMetricRow(t('session'), tokenUsage.currentSession, true)}
            {renderMetricRow(t('weekAll'), tokenUsage.weeklyAll, true)}
            {renderMetricRow(t('weekSonnet'), tokenUsage.weeklySonnet, true)}

            {/* Token breakdown */}
            <div className="mt-3 pt-2 border-t border-indigo-100 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white rounded px-2 py-1">
                <span className="text-gray-600">{t('input')}:</span>
                <span className="ml-1 font-medium text-blue-700">
                  {formatTokens(tokenUsage.currentSession.inputTokens)}
                </span>
              </div>
              <div className="bg-white rounded px-2 py-1">
                <span className="text-gray-600">{t('output')}:</span>
                <span className="ml-1 font-medium text-green-700">
                  {formatTokens(tokenUsage.currentSession.outputTokens)}
                </span>
              </div>
              <div className="bg-white rounded px-2 py-1">
                <span className="text-gray-600">{t('cacheCreate')}:</span>
                <span className="ml-1 font-medium text-orange-700">
                  {formatTokens(tokenUsage.currentSession.cacheCreationTokens)}
                </span>
              </div>
              <div className="bg-white rounded px-2 py-1">
                <span className="text-gray-600">{t('cacheRead')}:</span>
                <span className="ml-1 font-medium text-purple-700">
                  {formatTokens(tokenUsage.currentSession.cacheReadTokens)}
                </span>
              </div>
            </div>

            {/* Plan info */}
            <div className="mt-2 pt-2 border-t border-indigo-100 text-xs text-gray-600">
              {t('plan')}: <span className="font-medium text-gray-800">{tokenUsage.planType.replace('_', ' ').toUpperCase()}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full mode: Show all three metrics
  return (
    <div className="py-3 px-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
      <div className="flex items-start gap-4">
        {/* Token icon */}
        <div className="flex-shrink-0 mt-1 text-indigo-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-800">
              {t('title')}
              <span className="ml-2 text-xs font-normal text-gray-600">
                ({tokenUsage.planType.replace('_', ' ').toUpperCase()})
              </span>
            </h3>
          </div>

          {/* Three usage metrics */}
          <div className="space-y-2">
            {renderMetricRow(t('currentSession'), tokenUsage.currentSession)}
            {renderMetricRow(t('weekAll'), tokenUsage.weeklyAll)}
            {renderMetricRow(t('weekSonnet'), tokenUsage.weeklySonnet)}
          </div>

          {/* Expandable details */}
          <div className="mt-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors flex items-center gap-1"
            >
              {isExpanded ? t('hideDetails') : t('showDetails')}
              <svg
                className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExpanded && (
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
                  <div className="text-xs text-gray-600 mb-1">{t('input')}</div>
                  <div className="text-sm font-semibold text-blue-700">
                    {formatTokens(tokenUsage.currentSession.inputTokens)}
                  </div>
                </div>
                <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
                  <div className="text-xs text-gray-600 mb-1">{t('output')}</div>
                  <div className="text-sm font-semibold text-green-700">
                    {formatTokens(tokenUsage.currentSession.outputTokens)}
                  </div>
                </div>
                <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
                  <div className="text-xs text-gray-600 mb-1">{t('cacheCreation')}</div>
                  <div className="text-sm font-semibold text-orange-700">
                    {formatTokens(tokenUsage.currentSession.cacheCreationTokens)}
                  </div>
                </div>
                <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
                  <div className="text-xs text-gray-600 mb-1">{t('cacheRead')}</div>
                  <div className="text-sm font-semibold text-purple-700">
                    {formatTokens(tokenUsage.currentSession.cacheReadTokens)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
