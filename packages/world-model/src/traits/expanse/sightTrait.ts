/**
 * Sight Trait - an instrument: a thing one looks through to see farther in an expanse
 *
 * Public interface: `SightTrait` (data: how far it sees, in expanse units),
 * `ISightData`, `isSightTrait`.
 *
 * Owner context: world-model traits. `sight:` on a thing makes it an
 * instrument; `look through <instrument>` looks once with this sight in
 * place of the looker's own, still capped by the expanse's visibility. It is
 * a trait rather than a field on identity so the verb can dispatch on it
 * (ADR-090): the trait claims `if.action.searching`, where `look through`
 * maps, and the host registers the looking-through behavior per world. A vehicle's sight is on its open model and a landmark room's on
 * `RoomTrait.sight`; this trait is the instrument's alone.
 *
 * References:
 * - ADR-376 D6 — instruments, and the visibility cap that still applies through one.
 */

import { TraitType } from '../trait-types.js';
import { ITrait } from '../trait.js';

export interface ISightData {
  /** How far the instrument sees, in expanse units; zero or more. */
  sight: number;
}

/**
 * Trait for an instrument's reach.
 */
export class SightTrait implements ITrait, ISightData {
  static readonly type = TraitType.SIGHT;
  readonly type = TraitType.SIGHT;
  /** The action an instrument takes over (ADR-090): `look through` is searching's. */
  static readonly capabilities = ['if.action.searching'] as const;

  sight: number;

  /** @throws when the sight is not a number of zero or more */
  constructor(data: ISightData) {
    if (typeof data.sight !== 'number' || data.sight < 0) {
      throw new Error('SightTrait: sight is zero or more');
    }
    this.sight = data.sight;
  }
}

/**
 * Type guard for SightTrait
 */
export function isSightTrait(trait: ITrait): trait is SightTrait {
  return trait.type === TraitType.SIGHT;
}
