/**
 * Event type definitions for the scoring action
 */

/**
 * Event data for when score is displayed
 */
export interface ScoreDisplayedEventData {
  /** Current score */
  score: number;
  
  /** Maximum possible score */
  maxScore: number;
  
  /** Number of moves/turns taken */
  moves: number;
  
  /** Percentage of completion (if maxScore > 0) */
  percentage?: number;
  
  /** Player's rank based on score */
  rank?: string;
  
  /** List of achievements earned */
  achievements?: string[];
  
  /** Current game progress state */
  progress?: 'early_game' | 'mid_game' | 'late_game' | 'game_complete';
}

/**
 * Error data for scoring failures
 */
export interface ScoringErrorData {
  reason: 'scoring_not_enabled';
}

/**
 * Complete event map for scoring action
 */
export interface ScoringEventMap {
  'if.event.score_displayed': ScoreDisplayedEventData;
  'action.success': {
    actionId: string;
    messageId: string;
    params?: Record<string, any>;
  };
  'action.error': {
    actionId: string;
    messageId: string;
    params?: Record<string, any>;
  };
}
