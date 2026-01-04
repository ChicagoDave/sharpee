/**
 * DungeoScoringService - Extended scoring service with Zork mechanics (ADR-085)
 *
 * Extends the base ScoringService with:
 * - Trophy case treasure scoring (prevents double-scoring)
 * - Named achievements (one-time awards)
 * - Zork-specific ranks
 * - Hidden max score mechanic (ADR-078)
 *
 * @see ADR-085 Event-Based Scoring System
 * @see ADR-078 Thief's Canvas puzzle (hidden max points)
 */

import { IWorldModel, StandardCapabilities } from '@sharpee/world-model';
import { ScoringService, IScoringService, RankDefinition, ScoringServiceConfig, ScoringDefinition } from '@sharpee/stdlib';

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

  /** Check if the thief has been killed */
  isThiefDead(): boolean;

  /** Check if reality altered message is pending */
  isRealityAlteredPending(): boolean;

  /** Clear the reality altered pending flag */
  clearRealityAlteredPending(): void;
}

/**
 * Zork-specific rank definitions with message IDs
 * Based on the original Zork ranking system
 *
 * Note: "Master of Secrets" (500 pts) is a special rank that requires:
 * - Thief must be dead
 * - Canvas must be obtained (ghost ritual complete)
 * It appears BEFORE "Master Adventurer" for completionists. See ADR-078.
 */
export const ZORK_RANKS: RankDefinition[] = [
  { threshold: 0, messageId: 'dungeo.rank.beginner', name: 'Beginner' },
  { threshold: 25, messageId: 'dungeo.rank.amateur', name: 'Amateur Adventurer' },
  { threshold: 50, messageId: 'dungeo.rank.novice', name: 'Novice Adventurer' },
  { threshold: 100, messageId: 'dungeo.rank.junior', name: 'Junior Adventurer' },
  { threshold: 200, messageId: 'dungeo.rank.adventurer', name: 'Adventurer' },
  { threshold: 300, messageId: 'dungeo.rank.master', name: 'Master' },
  { threshold: 400, messageId: 'dungeo.rank.wizard', name: 'Wizard' },
  { threshold: 500, messageId: 'dungeo.rank.master_adventurer', name: 'Master Adventurer' },
];

/**
 * Dungeo-specific scoring service with trophy case mechanics
 */
export class DungeoScoringService extends ScoringService implements IDungeoScoringService {
  constructor(world: IWorldModel) {
    const config: ScoringServiceConfig = {
      maxScore: 616, // Standard Zork max (hidden 650 revealed after thief dies)
      enabled: true,
      ranks: ZORK_RANKS
    };
    super(world, config);
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

  /**
   * Check if the thief has been killed
   */
  isThiefDead(): boolean {
    const scoring = this.getScoringData();
    return scoring?.thiefDead ?? false;
  }

  /**
   * Check if reality altered message is pending
   */
  isRealityAlteredPending(): boolean {
    const scoring = this.getScoringData();
    return scoring?.realityAlteredPending ?? false;
  }

  /**
   * Clear the reality altered pending flag
   */
  clearRealityAlteredPending(): void {
    const scoring = this.getScoringData();
    if (scoring) {
      scoring.realityAlteredPending = false;
    }
  }

  /**
   * Get the current rank based on score
   *
   * Overrides base class to include "Master of Secrets" rank
   * for players who complete the ghost ritual puzzle (ADR-078).
   */
  getRank(): string {
    const score = this.getScore();
    const scoring = this.getScoringData();

    // Master of Secrets: 500+ points AND thief dead AND canvas obtained
    // This rank appears BEFORE "Master Adventurer" for completionists
    if (score >= 500 && scoring?.thiefDead && this.hasAchievement('canvas-revealed')) {
      return 'Master of Secrets';
    }

    // Fall through to normal rank calculation
    return super.getRank();
  }

  /**
   * Get rank message ID based on current score
   *
   * Overrides base class to include "Master of Secrets" rank
   * for players who complete the ghost ritual puzzle (ADR-078).
   */
  getRankMessageId(): string {
    const score = this.getScore();
    const scoring = this.getScoringData();

    // Master of Secrets: 500+ points AND thief dead AND canvas obtained
    if (score >= 500 && scoring?.thiefDead && this.hasAchievement('canvas-revealed')) {
      return 'dungeo.rank.master_secrets';
    }

    // Fall through to normal rank calculation
    return super.getRankMessageId();
  }

  /**
   * Get the scoring capability data
   */
  protected getScoringData(): Record<string, any> | null {
    return this.world.getCapability(StandardCapabilities.SCORING) ?? null;
  }
}
