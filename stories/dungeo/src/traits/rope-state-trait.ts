/**
 * Rope State Trait
 *
 * Trait for tracking whether a rope has been attached to the Dome Room railing.
 * Required for climbing down to the Torch Room.
 *
 * Replaces the anti-pattern of:
 * - (room as any).ropeAttached = true
 *
 * This trait persists through checkpoint save/restore.
 */

import { ITrait, ITraitConstructor } from '@sharpee/world-model';

/**
 * Configuration for the rope state trait
 */
export interface RopeStateTraitConfig {
  /** Whether a rope is attached to the railing */
  ropeAttached: boolean;
  /** Whether the room has a railing (static, for validation) */
  hasRailing: boolean;
  /** Room ID for the destination when climbing down */
  torchRoomId?: string;
}

/**
 * Rope State Trait
 *
 * Tracks rope attachment state for the Dome Room.
 * Required for the player to descend to the Torch Room.
 */
export class RopeStateTrait implements ITrait {
  static readonly type = 'dungeo.trait.rope_state' as const;

  readonly type = RopeStateTrait.type;

  /** Whether a rope is attached to the railing */
  ropeAttached: boolean;

  /** Whether the room has a railing */
  hasRailing: boolean;

  /** Room ID for the Torch Room destination */
  torchRoomId?: string;

  constructor(config: RopeStateTraitConfig) {
    this.ropeAttached = config.ropeAttached;
    this.hasRailing = config.hasRailing;
    this.torchRoomId = config.torchRoomId;
  }
}

// Ensure the class implements ITraitConstructor
export const RopeStateTraitConstructor: ITraitConstructor<RopeStateTrait> = RopeStateTrait;
