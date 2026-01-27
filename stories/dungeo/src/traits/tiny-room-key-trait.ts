/**
 * Tiny Room Key Trait
 *
 * Trait for tracking the state of the small key in the Tiny Room puzzle.
 * The key starts hidden (in the lock on the other side of the door).
 *
 * Replaces the anti-pattern of:
 * - (key as any).isHidden = true
 * - (key as any).isTinyRoomKey = true
 *
 * This trait persists through checkpoint save/restore.
 */

import { ITrait, ITraitConstructor } from '@sharpee/world-model';

/**
 * Configuration for the tiny room key trait
 */
export interface TinyRoomKeyTraitConfig {
  /** Whether the key is hidden (before puzzle is solved) */
  isHidden: boolean;
}

/**
 * Tiny Room Key Trait
 *
 * Tracks the visibility state of the small brass key:
 * - Hidden when still "in the lock" on the other side
 * - Visible once fallen onto mat and retrieved
 */
export class TinyRoomKeyTrait implements ITrait {
  static readonly type = 'dungeo.trait.tiny_room_key' as const;

  readonly type = TinyRoomKeyTrait.type;

  /** Whether the key is hidden (before puzzle is solved) */
  isHidden: boolean;

  constructor(config: TinyRoomKeyTraitConfig) {
    this.isHidden = config.isHidden;
  }
}

// Ensure the class implements ITraitConstructor
export const TinyRoomKeyTraitConstructor: ITraitConstructor<TinyRoomKeyTrait> = TinyRoomKeyTrait;
