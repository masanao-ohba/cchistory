/**
 * TokenUsageBar Component
 *
 * Displays Claude Code token usage with progress bars and reset timer.
 * Features:
 * - Compact progress bar showing 5-hour block usage
 * - Time remaining until next reset
 * - Expandable details for token breakdown
 * - Auto-refreshes based on configured interval
 */
'use client';

import { useState } from 'react';
import { useTokenUsage } from '@/lib/hooks/useTokenUsage';
import { useTranslations } from 'next-intl';
import type { TokenUsageResponse } from '@/lib/types/tokenUsage';

interface TokenUsageBarProps {
  compact?: boolean;
  initialData?: TokenUsageResponse;
}

export default function TokenUsageBar({ compact = false, initialData }: TokenUsageBarProps) {
  const { tokenUsage, isLoading, error } = useTokenUsage(true, initialData);
  const [isExpanded, setIsExpanded] = useState(false);
  const t = useTranslations('tokenUsage');

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
          <div className="flex-1 text-xs text-gray-500">Loading token usage...</div>
        </div>
      </div>
    );
  }

  // Format token count with K/M suffix
  const formatTokens = (tokens: number): string => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  // Calculate total including cache tokens for display
  const totalWithCache = tokenUsage.totalTokens + tokenUsage.cacheCreationTokens + tokenUsage.cacheReadTokens;

  // Format time remaining
  const formatTimeRemaining = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Format reset time in local timezone (to match Claude Code /status display)
  const formatResetTime = (date: Date): string => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Progress bar visualization (based on relative usage within the session)
  // Shows visual representation of time passed in the 5-hour block
  const timeElapsedMinutes = 300 - tokenUsage.timeRemainingMinutes; // 5 hours = 300 minutes
  const timePercentage = Math.min((timeElapsedMinutes / 300) * 100, 100);

  // Color based on time elapsed (not token usage, since there's no hard limit)
  const getProgressColor = (): string => {
    if (timePercentage < 50) return 'bg-blue-500';
    if (timePercentage < 75) return 'bg-indigo-500';
    return 'bg-purple-500';
  };

  if (compact) {
    // Compact mode: Single line with progress bar and time
    return (
      <div className="py-2 px-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
        <div className="flex items-center gap-3">
          {/* Token icon */}
          <div className="flex-shrink-0 text-indigo-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>

          {/* Progress bar - shows time elapsed in 5-hour block */}
          <div className="flex-1 min-w-0">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressColor()} transition-all duration-300`}
                style={{ width: `${timePercentage}%` }}
                title={`${timeElapsedMinutes.toFixed(0)} of 300 minutes elapsed in this 5-hour block`}
              />
            </div>
          </div>

          {/* Token count - show total with cache */}
          <div className="flex-shrink-0 text-xs font-medium text-gray-700">
            {formatTokens(totalWithCache)}
          </div>

          {/* Reset timer */}
          <div className="flex-shrink-0 text-xs text-gray-600">
            ↻ {formatTimeRemaining(tokenUsage.timeRemainingMinutes)}
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

        {/* Expanded details */}
        {isExpanded && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white rounded px-2 py-1">
              <span className="text-gray-600">{t('input')}:</span>
              <span className="ml-1 font-medium text-gray-800">
                {formatTokens(tokenUsage.inputTokens)}
              </span>
            </div>
            <div className="bg-white rounded px-2 py-1">
              <span className="text-gray-600">{t('output')}:</span>
              <span className="ml-1 font-medium text-gray-800">
                {formatTokens(tokenUsage.outputTokens)}
              </span>
            </div>
            <div className="bg-white rounded px-2 py-1">
              <span className="text-gray-600">{t('cacheCreation')}:</span>
              <span className="ml-1 font-medium text-gray-800">
                {formatTokens(tokenUsage.cacheCreationTokens)}
              </span>
            </div>
            <div className="bg-white rounded px-2 py-1">
              <span className="text-gray-600">{t('cacheRead')}:</span>
              <span className="ml-1 font-medium text-gray-800">
                {formatTokens(tokenUsage.cacheReadTokens)}
              </span>
            </div>
            <div className="col-span-2 bg-indigo-50 rounded px-2 py-1">
              <span className="text-gray-700">{t('resetAt')}:</span>
              <span className="ml-1 font-semibold text-indigo-700">
                {formatResetTime(tokenUsage.blockEndTime)}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full mode: More detailed display
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
            <h3 className="text-sm font-semibold text-gray-800">{t('title')}</h3>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">
                {formatTokens(totalWithCache)} tokens
              </span>
              <span className="text-sm text-gray-600">
                {t('resetIn')}: {formatTimeRemaining(tokenUsage.timeRemainingMinutes)}
              </span>
            </div>
          </div>

          {/* Progress bar - shows time elapsed in 5-hour block */}
          <div className="mb-2">
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
              <div
                className={`h-full ${getProgressColor()} transition-all duration-300 shadow-sm`}
                style={{ width: `${timePercentage}%` }}
                title={`${timeElapsedMinutes.toFixed(0)} of 300 minutes elapsed in this 5-hour block`}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-600">
              <span>{timePercentage.toFixed(0)}% of block time elapsed</span>
              <span>{t('resetAt')} {formatResetTime(tokenUsage.blockEndTime)}</span>
            </div>
          </div>

          {/* Expandable details */}
          <div>
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
                    {formatTokens(tokenUsage.inputTokens)}
                  </div>
                </div>
                <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
                  <div className="text-xs text-gray-600 mb-1">{t('output')}</div>
                  <div className="text-sm font-semibold text-green-700">
                    {formatTokens(tokenUsage.outputTokens)}
                  </div>
                </div>
                <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
                  <div className="text-xs text-gray-600 mb-1">{t('cacheCreation')}</div>
                  <div className="text-sm font-semibold text-orange-700">
                    {formatTokens(tokenUsage.cacheCreationTokens)}
                  </div>
                </div>
                <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
                  <div className="text-xs text-gray-600 mb-1">{t('cacheRead')}</div>
                  <div className="text-sm font-semibold text-purple-700">
                    {formatTokens(tokenUsage.cacheReadTokens)}
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
