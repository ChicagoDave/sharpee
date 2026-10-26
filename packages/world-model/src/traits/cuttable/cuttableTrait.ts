// packages/world-model/src/traits/cuttable/cuttableTrait.ts

import { ITrait } from '../trait.js';
import { TraitType } from '../trait-types.js';
import { IToolGated, ToolRequirement } from '../tool-requirement.js';

/**
 * Data for the cuttable trait (ADR-230 D3c).
 *
 * A declared tool requirement makes the cutting action refuse wrong or
 * missing tools; no requirement means any explicit tool (or none) passes
 * validation.
 */
export type ICuttableData = IToolGated;

/**
 * Cuttable trait — marks an entity the cutting action may target.
 *
 * The trait gates eligibility only. The cut OUTCOME is the entity's own
 * registered implementation (ADR-090 capability behavior from TS, or a
 * Chord `on cutting it` interceptor) — the standard cutting action never
 * mutates state itself. An entity with this trait and no registered
 * implementation is an authoring error (load-time in Chord; runtime
 * safety-net refusal otherwise).
 *
 * This trait contains only data; the tool check is the shared
 * tool-requirement resolver's.
 */
export class CuttableTrait implements ITrait, ICuttableData {
  static readonly type = TraitType.CUTTABLE;
  readonly type = TraitType.CUTTABLE;

  toolRequirement?: ToolRequirement;

  constructor(data: ICuttableData = {}) {
    this.toolRequirement = data.toolRequirement;
  }
}
