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
import {
  WarningIcon,
  LightningBoltIcon,
  RefreshIcon,
  SpinnerIcon,
  ChevronDownIcon,
} from './icons';

interface TokenUsageBarProps {
  compact?: boolean;
}

interface TokenDetailCardProps {
  label: string;
  value: string;
  colorClass: string;
  size?: 'compact' | 'normal';
}

function TokenDetailCard({ label, value, colorClass, size = 'normal' }: TokenDetailCardProps) {
  if (size === 'compact') {
    return (
      <div className="bg-white rounded px-2 py-1">
        <span className="text-gray-600">{label}:</span>
        <span className={`ml-1 font-medium ${colorClass}`}>{value}</span>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <div className={`text-sm font-semibold ${colorClass}`}>{value}</div>
    </div>
  );
}

interface SourceIndicatorProps {
  isApi: boolean;
  sourceApiLabel: string;
  sourceEstimateLabel: string;
}

function SourceIndicator({ isApi, sourceApiLabel, sourceEstimateLabel }: SourceIndicatorProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        isApi ? 'text-green-600' : 'text-gray-500'
      }`}
      title={isApi ? sourceApiLabel : sourceEstimateLabel}
    >
      {isApi ? (
        <>
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          <span className="hidden sm:inline">Live</span>
        </>
      ) : (
        <>
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
          <span className="hidden sm:inline">Est.</span>
        </>
      )}
    </span>
  );
}

export default function TokenUsageBar({ compact = false }: TokenUsageBarProps) {
  const t = useTranslations('tokenUsage');
  const locale = useLocale();
  const { tokenUsage, isLoading, error, refreshOAuthToken } = useTokenUsage(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // Set client-side flag to avoid hydration mismatch with time formatting
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('[TokenUsageBar] State:', { isLoading, hasData: !!tokenUsage, error: !!error });
  }, [isLoading, tokenUsage, error]);

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
      <div className="py-2 px-4 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 text-red-500">
            <WarningIcon />
          </div>
          <div className="flex-1 text-xs text-red-700">
            {t('title')}: {refreshError || error}
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex-shrink-0 px-3 py-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 disabled:bg-red-300 rounded-md transition-colors flex items-center gap-1"
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
      <div className="py-2 px-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 text-indigo-400 animate-pulse">
            <LightningBoltIcon />
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

  // Check if data is from Anthropic API
  const isFromApi = tokenUsage.source === 'anthropic_api';

  // Translation labels for SourceIndicator
  const sourceApiLabel = t('sourceApi');
  const sourceEstimateLabel = t('sourceEstimate');

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

    // Build tooltip based on limit type and data source
    let tooltipText = '';
    const sourceLabel = metric.isFromApi ? ' (Live)' : ' (Est.)';
    if (metric.limitTokens) {
      tooltipText = `${percentage.toFixed(1)}% used${sourceLabel} of ${formatTokens(metric.limitTokens)} token limit`;
    } else if (metric.limitHoursSonnet) {
      tooltipText = `${formatTokens(metric.totalTokens)} tokens used${sourceLabel}. Weekly limit: ${metric.limitHoursSonnet} hours (Sonnet)`;
    }

    return (
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Label - responsive width */}
        <div className="w-20 sm:w-28 lg:w-32 text-xs text-gray-700 font-medium flex-shrink-0 flex items-center gap-1">
          {label}
          {/* Show small API indicator dot for this specific metric */}
          {metric.isFromApi && (
            <span className="w-1 h-1 bg-green-500 rounded-full" title="Live data from Anthropic API" />
          )}
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
            <LightningBoltIcon />
          </div>

          {/* Current session info */}
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs text-gray-700">{t('session')}:</span>
            <span className="text-xs font-bold text-indigo-700">
              {tokenUsage.currentSession.percentageUsed !== null
                ? `${tokenUsage.currentSession.percentageUsed.toFixed(0)}%`
                : '-'}
            </span>
            <SourceIndicator isApi={isFromApi} sourceApiLabel={sourceApiLabel} sourceEstimateLabel={sourceEstimateLabel} />
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
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
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
              <TokenDetailCard
                label={t('input')}
                value={formatTokens(tokenUsage.currentSession.inputTokens)}
                colorClass="text-blue-700"
                size="compact"
              />
              <TokenDetailCard
                label={t('output')}
                value={formatTokens(tokenUsage.currentSession.outputTokens)}
                colorClass="text-green-700"
                size="compact"
              />
              <TokenDetailCard
                label={t('cacheCreate')}
                value={formatTokens(tokenUsage.currentSession.cacheCreationTokens)}
                colorClass="text-orange-700"
                size="compact"
              />
              <TokenDetailCard
                label={t('cacheRead')}
                value={formatTokens(tokenUsage.currentSession.cacheReadTokens)}
                colorClass="text-purple-700"
                size="compact"
              />
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
          <LightningBoltIcon className="w-5 h-5" />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              {t('title')}
              <span className="text-xs font-normal text-gray-600">
                ({tokenUsage.planType.replace('_', ' ').toUpperCase()})
              </span>
              <SourceIndicator isApi={isFromApi} sourceApiLabel={sourceApiLabel} sourceEstimateLabel={sourceEstimateLabel} />
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
              <ChevronDownIcon className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {isExpanded && (
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                <TokenDetailCard
                  label={t('input')}
                  value={formatTokens(tokenUsage.currentSession.inputTokens)}
                  colorClass="text-blue-700"
                />
                <TokenDetailCard
                  label={t('output')}
                  value={formatTokens(tokenUsage.currentSession.outputTokens)}
                  colorClass="text-green-700"
                />
                <TokenDetailCard
                  label={t('cacheCreation')}
                  value={formatTokens(tokenUsage.currentSession.cacheCreationTokens)}
                  colorClass="text-orange-700"
                />
                <TokenDetailCard
                  label={t('cacheRead')}
                  value={formatTokens(tokenUsage.currentSession.cacheReadTokens)}
                  colorClass="text-purple-700"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
