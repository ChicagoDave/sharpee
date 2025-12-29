/**
 * DungeoScoringService - Extended scoring service with trophy case mechanics
 *
 * Extends the base ScoringService with:
 * - Trophy case treasure scoring (prevents double-scoring)
 * - Named achievements (one-time awards)
 * - Zork-specific ranks
 *
 * @see ADR-076 Scoring System Architecture
 */

import { IWorldModel, StandardCapabilities } from '@sharpee/world-model';
import { ScoringService, IScoringService, RankDefinition } from '@sharpee/stdlib';

/**
 * Extended scoring service interface for Dungeo
 */
export interface IDungeoScoringService extends IScoringService {
  /** Score a treasure (returns false if already scored) */
  scoreTreasure(treasureId: string, points: number): boolean;

  /** Check if a treasure has been scored */
  isTreasureScored(treasureId: string): boolean;

  /** Add an achievement (returns false if already earned) */
  addAchievement(name: string, points: number): boolean;

  /** Check if an achievement has been earned */
  hasAchievement(name: string): boolean;
}

/**
 * Zork-specific rank definitions
 * Based on the original Zork ranking system
 */
export const ZORK_RANKS: RankDefinition[] = [
  { threshold: 0, name: 'Beginner' },
  { threshold: 25, name: 'Amateur Adventurer' },
  { threshold: 50, name: 'Novice Adventurer' },
  { threshold: 100, name: 'Junior Adventurer' },
  { threshold: 200, name: 'Adventurer' },
  { threshold: 300, name: 'Master' },
  { threshold: 400, name: 'Wizard' },
  { threshold: 500, name: 'Master Adventurer' },
];

/**
 * Dungeo-specific scoring service with trophy case mechanics
 */
export class DungeoScoringService extends ScoringService implements IDungeoScoringService {
  constructor(world: IWorldModel) {
    super(world, ZORK_RANKS);
  }

  /**
   * Score a treasure placed in the trophy case
   *
   * Treasures can only be scored once. Removing and re-adding
   * a treasure doesn't give more points (matching original Zork).
   *
   * @param treasureId - Unique identifier for the treasure
   * @param points - Point value of the treasure
   * @returns true if points were awarded, false if already scored
   */
  scoreTreasure(treasureId: string, points: number): boolean {
    const scoring = this.getScoringData();
    if (!scoring) return false;

    // Initialize scoredTreasures if needed
    if (!scoring.scoredTreasures) {
      scoring.scoredTreasures = [];
    }

    // Check if already scored
    if (scoring.scoredTreasures.includes(treasureId)) {
      return false;
    }

    // Mark as scored and add points
    scoring.scoredTreasures.push(treasureId);
    this.addPoints(points, `Placed ${treasureId} in trophy case`);

    return true;
  }

  /**
   * Check if a treasure has already been scored
   */
  isTreasureScored(treasureId: string): boolean {
    const scoring = this.getScoringData();
    return scoring?.scoredTreasures?.includes(treasureId) ?? false;
  }

  /**
   * Add an achievement (one-time award)
   *
   * Achievements are named and can only be earned once.
   *
   * @param name - Achievement name (used for tracking)
   * @param points - Point value of the achievement
   * @returns true if achievement was awarded, false if already earned
   */
  addAchievement(name: string, points: number): boolean {
    const scoring = this.getScoringData();
    if (!scoring) return false;

    // Initialize achievements if needed
    if (!scoring.achievements) {
      scoring.achievements = [];
    }

    // Check if already earned
    if (scoring.achievements.includes(name)) {
      return false;
    }

    // Add achievement and points
    scoring.achievements.push(name);
    this.addPoints(points, name);

    return true;
  }

  /**
   * Check if an achievement has been earned
   */
  hasAchievement(name: string): boolean {
    const scoring = this.getScoringData();
    return scoring?.achievements?.includes(name) ?? false;
  }
}
