/**
 * Token usage types for Claude Code usage tracking (API-only fast mode)
 * Shows utilization percentages from Anthropic OAuth API
 */

export interface UsageMetric {
  utilization: number;    // 0-100 percentage
  resets_at: string;      // ISO timestamp
}

export interface AnthropicData {
  five_hour: UsageMetric;
  seven_day: UsageMetric;
}

export interface TokenUsageResponse {
  available: boolean;
  source?: 'anthropic_api';
  current_session?: UsageMetric;
  weekly?: UsageMetric;
  anthropic_data?: AnthropicData;
  error?: string | null;
}

/**
 * UI-friendly formatted data for a single usage metric
 */
export interface FormattedUsageMetric {
  utilization: number;           // 0-100 percentage
  resetsAt: Date;                // Reset time
  timeRemainingMinutes: number;  // Minutes until reset
}

/**
 * UI-friendly formatted data derived from TokenUsageResponse
 */
export interface FormattedTokenUsage {
  currentSession: FormattedUsageMetric;
  weekly: FormattedUsageMetric;
}
