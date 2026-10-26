/**
 * Landmark Trait - a room an expanse holds: how far one sees from it, and how it looks from afar
 *
 * Public interface: `LandmarkTrait` (data: the room's outlook over its
 * expanse and its distant prose), `ILandmarkData`, `isLandmarkTrait`.
 *
 * Owner context: world-model traits, the expanse extension's own (`use
 * expanses`). A room named in an expanse's `landmarks` block carries it; no
 * core trait holds the extension's data. Where the landmark is — its cell —
 * stays the expanse's `landmarks` record, the one fact.
 *
 * References:
 * - ADR-376 D2 — landmarks occupy their cells.
 * - ADR-376 D6 — a landmark's outlook (`sight:`) and `seen from afar:`.
 * - Alignment finding D19, David's Q7 answer A (2026-10-21).
 */

import { TraitType } from '../trait-types.js';
import { ITrait } from '../trait.js';

export interface ILandmarkData {
  /** How far one sees from the room over its expanse, in expanse units; zero sees nothing. */
  sight?: number;
  /** What the room shows when seen from a distance (`seen from afar:`). */
  seenFromAfar?: string;
}

/**
 * Trait for a landmark room of an expanse.
 */
export class LandmarkTrait implements ITrait, ILandmarkData {
  static readonly type = TraitType.LANDMARK;
  readonly type = TraitType.LANDMARK;

  sight: number;
  seenFromAfar?: string;

  /** @throws when the sight is not a number of zero or more */
  constructor(data: ILandmarkData = {}) {
    const sight = data.sight ?? 0;
    if (typeof sight !== 'number' || sight < 0) {
      throw new Error('LandmarkTrait: sight is zero or more');
    }
    this.sight = sight;
    this.seenFromAfar = data.seenFromAfar;
  }
}

/**
 * Type guard for LandmarkTrait
 */
export function isLandmarkTrait(trait: ITrait): trait is LandmarkTrait {
  return trait.type === TraitType.LANDMARK;
}
