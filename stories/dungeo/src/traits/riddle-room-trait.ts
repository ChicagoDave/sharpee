/**
 * Riddle Room Trait
 *
 * Trait for tracking whether the riddle puzzle has been solved.
 * Answering "well" opens the east exit to the Pearl Room.
 *
 * Replaces the anti-pattern of:
 * - (room as any).riddleSolved = true
 *
 * This trait persists through checkpoint save/restore.
 */

import { ITrait, ITraitConstructor } from '@sharpee/world-model';

/**
 * Configuration for the riddle room trait
 */
export interface RiddleRoomTraitConfig {
  /** Whether the riddle has been solved */
  riddleSolved: boolean;
}

/**
 * Riddle Room Trait
 *
 * Tracks whether the riddle puzzle has been solved.
 * The correct answer is "well" (or "a well").
 */
export class RiddleRoomTrait implements ITrait {
  static readonly type = 'dungeo.trait.riddle_room' as const;

  readonly type = RiddleRoomTrait.type;

  /** Whether the riddle has been solved */
  riddleSolved: boolean;

  constructor(config: RiddleRoomTraitConfig) {
    this.riddleSolved = config.riddleSolved;
  }
}

// Ensure the class implements ITraitConstructor
export const RiddleRoomTraitConstructor: ITraitConstructor<RiddleRoomTrait> = RiddleRoomTrait;
