/**
 * ScoringService - Event-based scoring service (ADR-085)
 *
 * Features:
 * - Centralized scoring definitions (sourceId → points, reasonMessageId, category)
 * - Deduplication via scored sources Set
 * - Message IDs for all text (i18n-ready via TextService)
 * - Optional: stories can disable scoring entirely
 *
 * @see ADR-085 Event-Based Scoring System
 */

import { IWorldModel, StandardCapabilities } from '@sharpee/world-model';

/**
 * Entry in the score history
 */
export interface ScoreEntry {
  points: number;
  sourceId: string;
  reasonMessageId: string;
  timestamp: number;
}

/**
 * Rank definition mapping score thresholds to message IDs
 */
export interface RankDefinition {
  threshold: number;
  /** Message ID looked up via TextService (not the actual text) */
  messageId: string;
  /** Legacy: direct name string (deprecated, use messageId) */
  name?: string;
}

/**
 * Scoring definition for a single scoring source
 */
export interface ScoringDefinition {
  /** Points awarded for this source */
  points: number;
  /** Message ID for reason text (looked up via TextService) */
  reasonMessageId: string;
  /** Category for grouping/reporting */
  category: 'treasure' | 'puzzle' | 'exploration' | 'action';
}

/**
 * Configuration for creating a ScoringService
 */
export interface ScoringServiceConfig {
  /** Maximum possible score */
  maxScore: number;
  /** Whether scoring is enabled (default: true) */
  enabled?: boolean;
  /** Rank definitions (threshold → messageId) */
  ranks?: RankDefinition[];
  /** Scoring definitions (sourceId → definition) */
  definitions?: Record<string, ScoringDefinition>;
}

/**
 * Scoring service interface (ADR-085)
 */
export interface IScoringService {
  /** Whether scoring is enabled */
  isEnabled(): boolean;

  /** Get the current score */
  getScore(): number;

  /** Get the maximum possible score */
  getMaxScore(): number;

  /** Set the maximum score (for dynamic max like Dungeo's hidden points) */
  setMaxScore(max: number): void;

  /** Get the current move count */
  getMoves(): number;

  /** Increment the move counter */
  incrementMoves(): void;

  /** Get rank message ID based on current score (TextService looks up actual text) */
  getRankMessageId(): string;

  /** Legacy: Get rank name string (deprecated, use getRankMessageId) */
  getRank(): string;

  /** Check if a source has already been scored */
  hasScored(sourceId: string): boolean;

  /** Process a score gain by sourceId (looks up points from definitions, returns false if already scored) */
  scorePoints(sourceId: string): boolean;

  /** Process a score loss by sourceId (or override with explicit points) */
  losePoints(sourceId: string, overridePoints?: number): void;

  /** Get scoring definition for a sourceId */
  getDefinition(sourceId: string): ScoringDefinition | undefined;

  /** Register or update a scoring definition */
  registerDefinition(sourceId: string, definition: ScoringDefinition): void;

  /** Get all scored source IDs (for save/restore) */
  getScoredSources(): string[];

  /** Restore scored sources (for save/restore) */
  restoreScoredSources(sources: string[]): void;

  /** Get the score history */
  getHistory(): ScoreEntry[];

  /** Legacy: Add points directly (deprecated, use scorePoints with sourceId) */
  addPoints(points: number, reason?: string): void;
}

/**
 * Default rank definitions with message IDs
 */
export const DEFAULT_RANKS: RankDefinition[] = [
  { threshold: 0, messageId: 'if.rank.beginner', name: 'Beginner' },
  { threshold: 50, messageId: 'if.rank.novice', name: 'Novice' },
  { threshold: 100, messageId: 'if.rank.amateur', name: 'Amateur' },
  { threshold: 200, messageId: 'if.rank.experienced', name: 'Experienced' },
  { threshold: 350, messageId: 'if.rank.expert', name: 'Expert' },
  { threshold: 500, messageId: 'if.rank.master', name: 'Master' },
];

/**
 * Default scoring service implementation (ADR-085)
 *
 * Reads and writes scoring data from the SCORING capability.
 * Stories can extend this class to add custom scoring logic.
 */
export class ScoringService implements IScoringService {
  protected definitions: Map<string, ScoringDefinition> = new Map();
  protected enabled: boolean;

  constructor(
    protected world: IWorldModel,
    protected config: ScoringServiceConfig = { maxScore: 350 }
  ) {
    this.enabled = config.enabled ?? true;

    // Initialize capability data if needed
    const scoring = this.getScoringData();
    if (scoring) {
      if (scoring.maxScore === undefined) {
        scoring.maxScore = config.maxScore;
      }
      if (scoring.scoredSources === undefined) {
        scoring.scoredSources = [];
      }
    }

    // Load definitions from config
    if (config.definitions) {
      for (const [sourceId, def] of Object.entries(config.definitions)) {
        this.definitions.set(sourceId, def);
      }
    }
  }

  /**
   * Check if scoring is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
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
    return scoring?.maxScore ?? this.config.maxScore;
  }

  /**
   * Set the maximum score (for dynamic max like Dungeo's hidden points)
   */
  setMaxScore(max: number): void {
    const scoring = this.getScoringData();
    if (scoring) {
      scoring.maxScore = max;
    }
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
   * Get rank message ID based on current score
   */
  getRankMessageId(): string {
    const score = this.getScore();
    const ranks = this.config.ranks ?? DEFAULT_RANKS;

    let currentRank = ranks[0]?.messageId ?? 'if.rank.beginner';

    for (const rank of ranks) {
      if (score >= rank.threshold) {
        currentRank = rank.messageId;
      }
    }

    return currentRank;
  }

  /**
   * Legacy: Get rank name string (deprecated, use getRankMessageId)
   */
  getRank(): string {
    const score = this.getScore();
    const ranks = this.config.ranks ?? DEFAULT_RANKS;

    let currentRank = ranks[0]?.name ?? 'Beginner';

    for (const rank of ranks) {
      if (score >= rank.threshold) {
        currentRank = rank.name ?? rank.messageId;
      }
    }

    return currentRank;
  }

  /**
   * Check if a source has already been scored
   */
  hasScored(sourceId: string): boolean {
    const scoring = this.getScoringData();
    return scoring?.scoredSources?.includes(sourceId) ?? false;
  }

  /**
   * Process a score gain by sourceId
   * Returns false if already scored or no definition found
   */
  scorePoints(sourceId: string): boolean {
    if (!this.enabled) return false;

    // Check for duplicate scoring
    if (this.hasScored(sourceId)) {
      return false;
    }

    // Look up definition
    const definition = this.definitions.get(sourceId);
    if (!definition) {
      // No definition found - log warning but don't fail
      console.warn(`ScoringService: No definition found for sourceId "${sourceId}"`);
      return false;
    }

    const scoring = this.getScoringData();
    if (!scoring) return false;

    // Mark as scored
    if (!scoring.scoredSources) {
      scoring.scoredSources = [];
    }
    scoring.scoredSources.push(sourceId);

    // Add points
    scoring.scoreValue = (scoring.scoreValue || 0) + definition.points;

    // Add to history
    if (!scoring.scoreHistory) {
      scoring.scoreHistory = [];
    }
    scoring.scoreHistory.push({
      points: definition.points,
      sourceId,
      reasonMessageId: definition.reasonMessageId,
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Process a score loss by sourceId (or override with explicit points)
   */
  losePoints(sourceId: string, overridePoints?: number): void {
    if (!this.enabled) return;

    const scoring = this.getScoringData();
    if (!scoring) return;

    // Determine points to lose
    let points = overridePoints;
    let reasonMessageId = 'if.score.lost';

    if (points === undefined) {
      const definition = this.definitions.get(sourceId);
      if (definition) {
        points = definition.points;
        reasonMessageId = definition.reasonMessageId;
      } else {
        console.warn(`ScoringService: No definition found for sourceId "${sourceId}" and no overridePoints provided`);
        return;
      }
    }

    // Subtract points (can go negative)
    scoring.scoreValue = (scoring.scoreValue || 0) - points;

    // Add to history (negative points)
    if (!scoring.scoreHistory) {
      scoring.scoreHistory = [];
    }
    scoring.scoreHistory.push({
      points: -points,
      sourceId,
      reasonMessageId,
      timestamp: Date.now(),
    });
  }

  /**
   * Get scoring definition for a sourceId
   */
  getDefinition(sourceId: string): ScoringDefinition | undefined {
    return this.definitions.get(sourceId);
  }

  /**
   * Register or update a scoring definition
   */
  registerDefinition(sourceId: string, definition: ScoringDefinition): void {
    this.definitions.set(sourceId, definition);
  }

  /**
   * Get all scored source IDs (for save/restore)
   */
  getScoredSources(): string[] {
    const scoring = this.getScoringData();
    return scoring?.scoredSources ?? [];
  }

  /**
   * Restore scored sources (for save/restore)
   */
  restoreScoredSources(sources: string[]): void {
    const scoring = this.getScoringData();
    if (scoring) {
      scoring.scoredSources = [...sources];
    }
  }

  /**
   * Get the score history
   */
  getHistory(): ScoreEntry[] {
    const scoring = this.getScoringData();
    return scoring?.scoreHistory ?? [];
  }

  /**
   * Legacy: Add points directly (deprecated, use scorePoints with sourceId)
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
        sourceId: 'legacy',
        reasonMessageId: reason,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Get the scoring capability data
   */
  protected getScoringData(): Record<string, any> | null {
    return this.world.getCapability(StandardCapabilities.SCORING) ?? null;
  }
}
