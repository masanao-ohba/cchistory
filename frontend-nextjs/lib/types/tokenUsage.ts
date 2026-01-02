/**
 * Token usage types for Claude Code usage tracking
 * Matches official Claude Code status display with:
 * - Current session (5-hour block)
 * - Current week (all models)
 * - Current week (Opus only)
 */

export interface TokenCounts {
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  total_tokens: number;
}

export interface UsageMetric {
  start_time: string;                 // ISO timestamp
  end_time: string;                   // ISO timestamp
  time_remaining_minutes: number;
  usage: TokenCounts;
  limit_tokens: number;
  percentage_used: number;            // 0-100
  entries: number;                    // Number of usage entries
}

export interface PlanLimits {
  session: {
    messages: number;
    tokens: number;
  };
  weekly_all: {
    hours: number;
    tokens: number;
  };
  weekly_opus: {
    hours: number;
    tokens: number;
  };
}

export interface TokenUsageResponse {
  available: boolean;
  plan_type?: string;                 // "pro" | "max_5x" | "max_20x"
  limits?: PlanLimits;
  current_session?: UsageMetric;
  weekly_all?: UsageMetric;
  weekly_opus?: UsageMetric;
  error?: string | null;
}

/**
 * UI-friendly formatted data for a single usage metric
 */
export interface FormattedUsageMetric {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  startTime: Date;
  endTime: Date;
  timeRemainingMinutes: number;
  limitTokens: number;
  percentageUsed: number;
  entries: number;
}

/**
 * UI-friendly formatted data derived from TokenUsageResponse
 */
export interface FormattedTokenUsage {
  planType: string;
  limits: PlanLimits;
  currentSession: FormattedUsageMetric;
  weeklyAll: FormattedUsageMetric;
  weeklyOpus: FormattedUsageMetric;
}
