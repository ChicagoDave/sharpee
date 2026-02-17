/**
 * Royal Puzzle Trait
 *
 * Trait for tracking the Royal Puzzle sliding block puzzle state.
 * The puzzle is an 8x8 grid where the player pushes sandstone walls.
 *
 * Replaces the anti-pattern of:
 * - (controller as any).puzzleState = state
 *
 * This trait persists through checkpoint save/restore.
 */

import { ITrait, ITraitConstructor } from '@sharpee/world-model';

// Cell type constants
export const MARBLE = 1;
export const EMPTY = 0;
export const SANDSTONE = -1;
export const LADDER = -2;
export const BAD_LADDER = -3;

/**
 * Configuration for the royal puzzle trait
 */
export interface RoyalPuzzleTraitConfig {
  /** 64-element grid (8x8, row-major) */
  grid: number[];
  /** Player position in grid (0-63) */
  playerPos: number;
  /** Whether the gold card has been taken */
  cardTaken: boolean;
  /** Whether the player has exited the puzzle */
  hasExited: boolean;
  /** Whether the player is currently in the puzzle */
  inPuzzle: boolean;
  /** Number of pushes made */
  pushCount: number;
}

/**
 * Royal Puzzle Trait
 *
 * Tracks the state of the sliding block puzzle.
 * Grid values: MARBLE (1), EMPTY (0), SANDSTONE (-1), LADDER (-2), BAD_LADDER (-3)
 */
export class RoyalPuzzleTrait implements ITrait {
  static readonly type = 'dungeo.trait.royal_puzzle' as const;

  readonly type = RoyalPuzzleTrait.type;

  /** 64-element grid (8x8, row-major) */
  grid: number[];

  /** Player position in grid (0-63) */
  playerPos: number;

  /** Whether the gold card has been taken */
  cardTaken: boolean;

  /** Whether the player has exited the puzzle */
  hasExited: boolean;

  /** Whether the player is currently in the puzzle */
  inPuzzle: boolean;

  /** Number of pushes made */
  pushCount: number;

  constructor(config: RoyalPuzzleTraitConfig) {
    this.grid = [...config.grid];
    this.playerPos = config.playerPos;
    this.cardTaken = config.cardTaken;
    this.hasExited = config.hasExited;
    this.inPuzzle = config.inPuzzle;
    this.pushCount = config.pushCount;
  }
}

// Ensure the class implements ITraitConstructor
export const RoyalPuzzleTraitConstructor: ITraitConstructor<RoyalPuzzleTrait> = RoyalPuzzleTrait;
