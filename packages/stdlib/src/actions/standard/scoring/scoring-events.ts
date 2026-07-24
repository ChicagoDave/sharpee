/**
 * Event type definitions for the scoring action
 */

/**
 * Event data for when score is displayed
 * Uses domain event pattern with embedded messageId (ADR-097)
 *
 * `moves`, `achievements`, `progress`, `hasAchievements`, and `progressMessage`
 * were removed by ADR-260 D3: nothing on the platform ever produced them, so
 * they reached the display as `0` / `[]` / percentage-band prose stdlib had no
 * business inventing. A story that wants them keeps them in its own capability
 * and overrides the message.
 */
export interface ScoreDisplayedEventData {
  /** Message ID for text-service lookup */
  messageId?: string;
  /** Parameters for message template substitution */
  params?: Record<string, any>;

  // Domain data
  /** Current score */
  score?: number;

  /** Maximum possible score */
  maxScore?: number;

  /** Percentage of completion (if maxScore > 0) */
  percentage?: number;

  /**
   * The player's current rank ID — the stable join key, not the display name.
   * The author's `RankDefinition.name` reaches the template through
   * `params.rank` instead, the same way an entity name does.
   */
  rank?: string;

  /** Whether scoring is enabled */
  enabled?: boolean;

  /** Whether this is a blocked/error case */
  blocked?: boolean;

  /** Reason for block (if blocked) */
  reason?: string;
}

/**
 * Complete event map for scoring action
 */
export interface ScoringEventMap {
  'if.event.score_displayed': ScoreDisplayedEventData;
}
