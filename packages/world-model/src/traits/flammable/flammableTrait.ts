/**
 * Flammable trait (ADR-371 D2) — marks an entity the burning action may
 * target, and carries its tool requirement. Cuttable's shape, for burning.
 *
 * Public interface: FlammableTrait, IFlammableData.
 * Owner context: @sharpee/world-model / traits
 */

import { ITrait } from '../trait.js';
import { TraitType } from '../trait-types.js';
import { IToolGated, ToolRequirement } from '../tool-requirement.js';

/**
 * Data for the flammable trait. A declared tool requirement makes the
 * burning action refuse wrong or missing tools; no requirement means any
 * explicit tool (or none) passes validation.
 */
export type IFlammableData = IToolGated;

/**
 * Flammable trait — eligibility and tool data only. The burn OUTCOME is the
 * entity's own registered implementation (an ADR-090 capability behavior, or
 * a Chord `on the player burning` interceptor) — the standard burning action
 * never mutates state itself. A flammable entity with no implementation is an
 * authoring error (load-time in Chord; runtime safety-net refusal otherwise).
 */
export class FlammableTrait implements ITrait, IFlammableData {
  static readonly type = TraitType.FLAMMABLE;
  readonly type = TraitType.FLAMMABLE;

  toolRequirement?: ToolRequirement;

  constructor(data: IFlammableData = {}) {
    this.toolRequirement = data.toolRequirement;
  }
}
