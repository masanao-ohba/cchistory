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
 * Plan-specific token thresholds
 * Will be used when plan detection is implemented
 */
export const PLAN_TOKEN_THRESHOLDS = {
  pro: {
    light: 25000,
    medium: 50000,
    heavy: 75000,
    veryHeavy: 100000,
    warning: 100000,
  } as TokenUsageThresholds,

  max5x: {
    light: 100000,
    medium: 250000,
    heavy: 400000,
    veryHeavy: 500000,
    warning: 500000,
  } as TokenUsageThresholds,

  max20x: {
    light: 400000,
    medium: 900000,
    heavy: 1200000,
    veryHeavy: 1500000,
    warning: 1500000,
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
