/**
 * ScoringService - Default scoring service for tracking player score and rank
 *
 * Provides basic scoring functionality that stories can use directly or extend.
 * Reads/writes from the SCORING capability on the world model.
 *
 * @see ADR-076 Scoring System Architecture
 */

import { IWorldModel, StandardCapabilities } from '@sharpee/world-model';

/**
 * Entry in the score history
 */
export interface ScoreEntry {
  points: number;
  reason: string;
  timestamp: number;
}

/**
 * Rank definition mapping score thresholds to rank names
 */
export interface RankDefinition {
  threshold: number;
  name: string;
}

/**
 * Scoring service interface
 */
export interface IScoringService {
  /** Add points to the score with optional reason */
  addPoints(points: number, reason?: string): void;

  /** Get the current score */
  getScore(): number;

  /** Get the maximum possible score */
  getMaxScore(): number;

  /** Get the current move count */
  getMoves(): number;

  /** Increment the move counter */
  incrementMoves(): void;

  /** Get the current rank based on score */
  getRank(): string;

  /** Get the score history */
  getHistory(): ScoreEntry[];
}

/**
 * Default rank definitions for generic IF games
 */
export const DEFAULT_RANKS: RankDefinition[] = [
  { threshold: 0, name: 'Beginner' },
  { threshold: 50, name: 'Novice' },
  { threshold: 100, name: 'Amateur' },
  { threshold: 200, name: 'Experienced' },
  { threshold: 350, name: 'Expert' },
  { threshold: 500, name: 'Master' },
];

/**
 * Default scoring service implementation
 *
 * Reads and writes scoring data from the SCORING capability.
 * Stories can extend this class to add custom scoring logic.
 */
export class ScoringService implements IScoringService {
  constructor(
    protected world: IWorldModel,
    protected ranks: RankDefinition[] = DEFAULT_RANKS
  ) {}

  /**
   * Add points to the score
   */
  addPoints(points: number, reason?: string): void {
    const scoring = this.getScoringData();
    if (!scoring) return;

    scoring.scoreValue = (scoring.scoreValue || 0) + points;

    // Add to history if reason provided
    if (reason) {
      if (!scoring.scoreHistory) {
        scoring.scoreHistory = [];
      }
      scoring.scoreHistory.push({
        points,
        reason,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Get the current score
   */
  getScore(): number {
    const scoring = this.getScoringData();
    return scoring?.scoreValue ?? 0;
  }

  /**
   * Get the maximum possible score
   */
  getMaxScore(): number {
    const scoring = this.getScoringData();
    return scoring?.maxScore ?? 0;
  }

  /**
   * Get the current move count
   */
  getMoves(): number {
    const scoring = this.getScoringData();
    return scoring?.moves ?? 0;
  }

  /**
   * Increment the move counter
   */
  incrementMoves(): void {
    const scoring = this.getScoringData();
    if (!scoring) return;

    scoring.moves = (scoring.moves || 0) + 1;
  }

  /**
   * Get the current rank based on score
   */
  getRank(): string {
    const score = this.getScore();

    // Find the highest rank the player has achieved
    let currentRank = this.ranks[0]?.name ?? 'Unknown';

    for (const rank of this.ranks) {
      if (score >= rank.threshold) {
        currentRank = rank.name;
      }
    }

    return currentRank;
  }

  /**
   * Get the score history
   */
  getHistory(): ScoreEntry[] {
    const scoring = this.getScoringData();
    return scoring?.scoreHistory ?? [];
  }

  /**
   * Get the scoring capability data
   */
  protected getScoringData(): Record<string, any> | null {
    return this.world.getCapability(StandardCapabilities.SCORING) ?? null;
  }
}
