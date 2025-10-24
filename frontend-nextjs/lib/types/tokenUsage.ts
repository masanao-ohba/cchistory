/**
 * Token usage types for Claude Code 5-hour block tracking
 */

export interface TokenCounts {
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
}

export interface CurrentBlock {
  start_time: string;           // ISO timestamp
  end_time: string;             // ISO timestamp
  is_active: boolean;
  entries: number;              // Number of assistant messages with usage data
  token_counts: TokenCounts;
  total_tokens: number;         // input_tokens + output_tokens
  time_remaining_minutes: number;
}

export interface TokenUsageResponse {
  available: boolean;
  current_block: CurrentBlock | null;
  error: string | null;
}

/**
 * UI-friendly formatted data derived from TokenUsageResponse
 */
export interface FormattedTokenUsage {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  blockStartTime: Date;
  blockEndTime: Date;
  timeRemainingMinutes: number;
  entries: number;
  isActive: boolean;
}
