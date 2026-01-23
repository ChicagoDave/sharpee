/**
 * Event type definitions for the scoring action
 */

/**
 * Event data for when score is displayed
 * Uses domain event pattern with embedded messageId (ADR-097)
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

  /** Number of moves/turns taken */
  moves?: number;

  /** Percentage of completion (if maxScore > 0) */
  percentage?: number;

  /** Player's rank based on score */
  rank?: string;

  /** List of achievements earned */
  achievements?: string[];

  /** Current game progress state */
  progress?: 'early_game' | 'mid_game' | 'late_game' | 'game_complete';

  /** Whether scoring is enabled */
  enabled?: boolean;

  /** Whether this is a blocked/error case */
  blocked?: boolean;

  /** Reason for block (if blocked) */
  reason?: string;

  /** Whether achievements should be displayed */
  hasAchievements?: boolean;

  /** Progress message ID */
  progressMessage?: string;
}

/**
 * Complete event map for scoring action
 */
export interface ScoringEventMap {
  'if.event.score_displayed': ScoreDisplayedEventData;
}
