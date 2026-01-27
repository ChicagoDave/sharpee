/**
 * Round Room Trait
 *
 * Trait for tracking the Round Room's spinning state.
 * When not fixed, exits are randomized. The robot can fix it.
 *
 * Replaces the anti-pattern of:
 * - (room as any).isFixed = false
 *
 * This trait persists through checkpoint save/restore.
 */

import { ITrait, ITraitConstructor } from '@sharpee/world-model';

/**
 * Configuration for the round room trait
 */
export interface RoundRoomTraitConfig {
  /** Whether the room is fixed (false = spinning/randomized exits) */
  isFixed: boolean;
}

/**
 * Round Room Trait
 *
 * Tracks whether the Round Room's carousel mechanism is fixed.
 * When not fixed, compass readings are unreliable and exits randomize.
 */
export class RoundRoomTrait implements ITrait {
  static readonly type = 'dungeo.trait.round_room' as const;

  readonly type = RoundRoomTrait.type;

  /** Whether the room is fixed (stops spinning) */
  isFixed: boolean;

  constructor(config: RoundRoomTraitConfig) {
    this.isFixed = config.isFixed;
  }
}

// Ensure the class implements ITraitConstructor
export const RoundRoomTraitConstructor: ITraitConstructor<RoundRoomTrait> = RoundRoomTrait;
