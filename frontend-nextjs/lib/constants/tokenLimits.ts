/**
 * Token usage thresholds for Claude Code
 * These constants define usage level ranges for visualization
 */

export interface TokenUsageThresholds {
  /** Light usage threshold (0-light): Blue indicator */
  light: number;
  /** Medium usage threshold (light-medium): Indigo indicator */
  medium: number;
  /** Heavy usage threshold (medium-heavy): Purple indicator */
  heavy: number;
  /** Very heavy usage threshold (heavy-veryHeavy): Orange indicator */
  veryHeavy: number;
  /** Warning usage threshold (veryHeavy+): Red indicator with warning */
  warning: number;
}

/**
 * Default token usage thresholds
 * Based on estimated Max 5x plan usage patterns
 */
export const DEFAULT_TOKEN_THRESHOLDS: TokenUsageThresholds = {
  light: 50000,      // 0-50K tokens = Light Usage (Blue)
  medium: 100000,    // 50-100K tokens = Medium Usage (Indigo)
  heavy: 200000,     // 100-200K tokens = Heavy Usage (Purple)
  veryHeavy: 500000, // 200-500K tokens = Very Heavy Usage (Orange)
  warning: 500000,   // 500K+ tokens = Warning (Red)
};

/**
 * Plan-specific token thresholds (based on official 5-hour session limits)
 * Updated to match Claude Code official limits (January 2026)
 *
 * Official session limits:
 * - Pro: ~44,000 tokens per 5-hour session
 * - Max 5x: ~88,000 tokens per 5-hour session
 * - Max 20x: ~220,000 tokens per 5-hour session
 */
export const PLAN_TOKEN_THRESHOLDS = {
  pro: {
    light: 11000,      // 0-25% of 44K
    medium: 22000,     // 25-50% of 44K
    heavy: 33000,      // 50-75% of 44K
    veryHeavy: 39600,  // 75-90% of 44K
    warning: 44000,    // 90-100% of 44K
  } as TokenUsageThresholds,

  max5x: {
    light: 22000,      // 0-25% of 88K
    medium: 44000,     // 25-50% of 88K
    heavy: 66000,      // 50-75% of 88K
    veryHeavy: 79200,  // 75-90% of 88K
    warning: 88000,    // 90-100% of 88K
  } as TokenUsageThresholds,

  max20x: {
    light: 55000,      // 0-25% of 220K
    medium: 110000,    // 25-50% of 220K
    heavy: 165000,     // 50-75% of 220K
    veryHeavy: 198000, // 75-90% of 220K
    warning: 220000,   // 90-100% of 220K
  } as TokenUsageThresholds,
};

/**
 * Usage level labels
 */
export const USAGE_LEVEL_LABELS = {
  light: 'Light Usage',
  medium: 'Medium Usage',
  heavy: 'Heavy Usage',
  veryHeavy: 'Very Heavy Usage',
  warning: '⚠️ Warning: High Usage',
} as const;

/**
 * Progress bar colors for each usage level
 */
export const USAGE_LEVEL_COLORS = {
  light: 'bg-blue-500',
  medium: 'bg-indigo-500',
  heavy: 'bg-purple-500',
  veryHeavy: 'bg-orange-500',
  warning: 'bg-red-500',
} as const;
