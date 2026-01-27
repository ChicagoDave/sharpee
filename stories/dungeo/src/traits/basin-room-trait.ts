/**
 * Basin Room Trait
 *
 * Trait for tracking the ritual basin's state.
 * Burning incense in the basin disarms its trap temporarily.
 *
 * Replaces the anti-pattern of:
 * - (room as any).basinState = 'disarmed'
 *
 * This trait persists through checkpoint save/restore.
 */

import { ITrait, ITraitConstructor } from '@sharpee/world-model';

/** Basin states */
export type BasinState = 'normal' | 'disarmed';

/**
 * Configuration for the basin room trait
 */
export interface BasinRoomTraitConfig {
  /** Current state of the basin trap */
  basinState: BasinState;
}

/**
 * Basin Room Trait
 *
 * Tracks the ritual basin's trap state.
 * When disarmed (by burning incense), items placed in basin work normally.
 * When normal, placing items in basin triggers the trap.
 */
export class BasinRoomTrait implements ITrait {
  static readonly type = 'dungeo.trait.basin_room' as const;

  readonly type = BasinRoomTrait.type;

  /** Current state of the basin trap */
  basinState: BasinState;

  constructor(config: BasinRoomTraitConfig) {
    this.basinState = config.basinState;
  }
}

// Ensure the class implements ITraitConstructor
export const BasinRoomTraitConstructor: ITraitConstructor<BasinRoomTrait> = BasinRoomTrait;
