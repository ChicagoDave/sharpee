/**
 * River Navigation Trait
 *
 * Trait for marking rooms with river navigation properties.
 * Used by the Frigid River region for boat navigation mechanics.
 *
 * Replaces the anti-patterns:
 * - (room as any).isWaterRoom = true
 * - (room as any).canLaunchBoat = true
 * - (room as any).isRainbowRoom = true
 * - (room as any).launchDestination = id
 *
 * This trait persists through checkpoint save/restore, unlike custom properties.
 */

import { ITrait, ITraitConstructor } from '@sharpee/world-model';

/**
 * Configuration for the river navigation trait
 */
export interface RiverNavigationTraitConfig {
  /**
   * True if this is a water room requiring boat navigation.
   * Player cannot enter water rooms without being in an inflated boat
   * (unless on the rainbow).
   */
  isWaterRoom?: boolean;

  /**
   * Position in the river sequence (1-5 for Frigid River 1-5).
   * Used for tracking progress downstream.
   */
  riverPosition?: number;

  /**
   * True if boats can be launched from this room.
   * Shore/beach rooms with river access have this set.
   */
  canLaunchBoat?: boolean;

  /**
   * Explicit destination room ID when launching from this location.
   * If not set, launch action will look for E/W exits to water rooms.
   * Used for Dam Base which has no direct exit to river.
   */
  launchDestination?: string;

  /**
   * True if this is a rainbow room (On the Rainbow, End of Rainbow).
   * Rainbow rooms allow walking to/from water rooms without a boat
   * because the magical rainbow acts as a bridge.
   */
  isRainbowRoom?: boolean;
}

/**
 * River Navigation Trait
 *
 * Rooms with this trait participate in river navigation mechanics:
 * - Water rooms block entry without boat
 * - Launch points allow entering the river
 * - Rainbow rooms bypass the boat requirement
 */
export class RiverNavigationTrait implements ITrait {
  static readonly type = 'dungeo.trait.river_navigation' as const;

  readonly type = RiverNavigationTrait.type;

  /** True if this is a water room requiring boat navigation */
  isWaterRoom: boolean;

  /** Position in river sequence (1-5) */
  riverPosition: number;

  /** True if boats can be launched from this room */
  canLaunchBoat: boolean;

  /** Explicit launch destination room ID */
  launchDestination: string | null;

  /** True if this is a rainbow room */
  isRainbowRoom: boolean;

  constructor(config: RiverNavigationTraitConfig) {
    this.isWaterRoom = config.isWaterRoom ?? false;
    this.riverPosition = config.riverPosition ?? 0;
    this.canLaunchBoat = config.canLaunchBoat ?? false;
    this.launchDestination = config.launchDestination ?? null;
    this.isRainbowRoom = config.isRainbowRoom ?? false;
  }
}

// Ensure the class implements ITraitConstructor
export const RiverNavigationTraitConstructor: ITraitConstructor<RiverNavigationTrait> = RiverNavigationTrait;
