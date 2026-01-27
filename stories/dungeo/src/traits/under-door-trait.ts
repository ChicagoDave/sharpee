/**
 * Under Door Trait
 *
 * Trait for tracking whether an item (typically a mat) is positioned under a door.
 * Used in the Tiny Room key puzzle where the mat catches the falling key.
 *
 * Replaces the anti-pattern of:
 * - (mat as any).isUnderDoor = true
 *
 * This trait persists through checkpoint save/restore.
 */

import { ITrait, ITraitConstructor } from '@sharpee/world-model';

/**
 * Configuration for the under door trait
 */
export interface UnderDoorTraitConfig {
  /** Whether the item is currently positioned under a door */
  isUnderDoor: boolean;
}

/**
 * Under Door Trait
 *
 * Tracks whether an item has been slid under a door.
 * Primarily used for the welcome mat in the Tiny Room puzzle.
 */
export class UnderDoorTrait implements ITrait {
  static readonly type = 'dungeo.trait.under_door' as const;

  readonly type = UnderDoorTrait.type;

  /** Whether the item is currently positioned under a door */
  isUnderDoor: boolean;

  constructor(config: UnderDoorTraitConfig) {
    this.isUnderDoor = config.isUnderDoor;
  }
}

// Ensure the class implements ITraitConstructor
export const UnderDoorTraitConstructor: ITraitConstructor<UnderDoorTrait> = UnderDoorTrait;
