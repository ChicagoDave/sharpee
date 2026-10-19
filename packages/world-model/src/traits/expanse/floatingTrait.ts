/**
 * Floating Trait - a position in an expanse for something that is not a vehicle
 *
 * Public interface: `FloatingTrait` (data: the cell, held only while the
 * holder is in an expanse), `IFloatingData`, `isFloatingTrait`.
 *
 * Owner context: world-model traits. Two things hold one: a thing marked
 * `floats`, which drifts on the expanse's interval and is retrieved
 * alongside, and a player out of their vehicle in the expanse, who holds
 * the vehicle's cell while they are out and never drifts. In either case
 * the position is held only while the holder is in the expanse room; at a
 * landmark, or anywhere else, it is null and the holder's location is the
 * one record, as for a vehicle (ADR-376 D5).
 *
 * References:
 * - ADR-376 D10 — floating things: marked, positioned, drifting, retrieved.
 * - ADR-376 D9 — the player out of the vehicle holds a floating position of their own.
 */

import { TraitType } from '../trait-types.js';
import { ITrait } from '../trait.js';
import type { IExpanseCell } from './expanseTrait.js';

export interface IFloatingData {
  /** The cell in the expanse the holder is in, or null when it is not in one. */
  position?: IExpanseCell | null;
}

/**
 * Trait for a floating position. Pure data; the drift and the retrieval
 * rules are `expanseBehavior.ts` and the actions.
 */
export class FloatingTrait implements ITrait, IFloatingData {
  static readonly type = TraitType.FLOATING;
  readonly type = TraitType.FLOATING;

  position: IExpanseCell | null;

  constructor(data: IFloatingData = {}) {
    this.position = data.position ? { x: data.position.x, y: data.position.y } : null;
  }
}

/**
 * Type guard for FloatingTrait
 */
export function isFloatingTrait(trait: ITrait): trait is FloatingTrait {
  return trait.type === TraitType.FLOATING;
}
