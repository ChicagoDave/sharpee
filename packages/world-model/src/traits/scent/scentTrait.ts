// packages/world-model/src/traits/scent/scentTrait.ts

/**
 * Scent trait — how strongly a thing smells (ADR-392 D5).
 *
 * A thing with this trait has a scent of its own; `strength` says how far
 * it carries. The scope layer reads it: a `strong` scent escapes a closed
 * container, a `moderate` or `faint` one does not. A thing without the
 * trait still has the implicit faint scent of its kind (an edible, an
 * actor) or none at all; that fallback is the scope layer's, not this
 * trait's.
 *
 * The scale is the one the witness events already used for scent
 * (`WitnessScentEvent.intensity`), exported from here so both read one
 * type. `descriptionId` is reserved for the per-sense prose line the
 * senses round adds (what the thing smells of); nothing reads it yet.
 *
 * Pure data (ADR-346 D1): a default, no policing.
 *
 * Public interface: ScentTrait, IScentData, ScentStrength.
 * Owner context: @sharpee/world-model — sensory traits.
 */

import { ITrait } from '../trait.js';
import { TraitType } from '../trait-types.js';

/** How far a scent carries: `strong` escapes a closed container, the others do not. */
export type ScentStrength = 'faint' | 'moderate' | 'strong';

export interface IScentData {
  /** How strongly the thing smells; defaults to `moderate` */
  strength?: ScentStrength;

  /** Message id of what it smells of; reserved for the senses round, unread today */
  descriptionId?: string;
}

/**
 * Scent trait — a thing that smells, and how strongly.
 */
export class ScentTrait implements ITrait, IScentData {
  static readonly type = TraitType.SCENT;
  readonly type = TraitType.SCENT;

  strength: ScentStrength;
  descriptionId?: string;

  constructor(data: IScentData = {}) {
    this.strength = data.strength ?? 'moderate';
    this.descriptionId = data.descriptionId;
  }
}
