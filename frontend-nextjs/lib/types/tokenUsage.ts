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

/**
 * Raw/Corrected value pair for hybrid display
 */
export interface UsageValuePair {
  tokens: number;
  percentage: number;
}

export interface CorrectedValue extends UsageValuePair {
  factor: number;  // Correction factor applied (e.g., 0.24)
}

export interface UsageMetric {
  start_time: string;                 // ISO timestamp
  end_time: string;                   // ISO timestamp
  time_remaining_minutes: number;
  usage: TokenCounts;
  // Session limits are token-based
  limit_tokens?: number;
  // Weekly limits are hour-based (cannot be converted to tokens)
  limit_hours_sonnet?: string;        // e.g., "240-480"
  limit_hours_opus?: string | number; // e.g., "24-40" or 0
  limit_note?: string;
  percentage_used: number | null;     // 0-100 or null (legacy, use corrected for display)
  entries: number;                    // Number of usage entries
  // Hybrid display: raw and corrected values
  raw?: UsageValuePair;               // Raw calculated values
  corrected?: CorrectedValue;         // Claude Code estimated values (apply correction factor)
}

export interface PlanLimits {
  session: {
    tokens: number;
    equivalent_prompts: string;
  };
  weekly_all: {
    hours_sonnet: string;          // e.g., "240-480"
    hours_opus: string | number;   // e.g., "24-40" or 0
    note: string;
  };
}

export interface TokenUsageResponse {
  available: boolean;
  plan_type?: string;                 // "pro" | "max_5x" | "max_20x"
  limits?: PlanLimits;
  current_session?: UsageMetric;
  weekly_all?: UsageMetric;
  weekly_sonnet?: UsageMetric;  // Changed from weekly_opus
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
  // Token-based limits (for session)
  limitTokens?: number;
  // Hour-based limits (for weekly)
  limitHoursSonnet?: string;
  limitHoursOpus?: string | number;
  limitNote?: string;
  percentageUsed: number | null;  // Corrected percentage (Claude Code estimated)
  entries: number;
  // Hybrid display: raw and corrected values
  rawTokens?: number;
  rawPercentage?: number | null;
  correctionFactor?: number;
}

/**
 * UI-friendly formatted data derived from TokenUsageResponse
 */
export interface FormattedTokenUsage {
  planType: string;
  limits: PlanLimits;
  currentSession: FormattedUsageMetric;
  weeklyAll: FormattedUsageMetric;
  weeklySonnet: FormattedUsageMetric;  // Changed from weeklyOpus
}
