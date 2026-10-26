// packages/world-model/src/traits/diggable/diggableTrait.ts

import { ITrait } from '../trait.js';
import { TraitType } from '../trait-types.js';
import { IToolGated, ToolRequirement } from '../tool-requirement.js';

/**
 * Data for the diggable trait (ADR-230 Phase 6 (sketch ruling 6)).
 *
 * A declared tool requirement makes the digging action refuse wrong or
 * missing tools; no requirement means any explicit tool (or none) passes
 * validation.
 */
export type IDiggableData = IToolGated;

/**
 * Diggable trait — marks an entity the digging action may target.
 *
 * The trait gates eligibility only. The dig OUTCOME is the entity's own
 * registered implementation (ADR-090 capability behavior from TS, or a
 * Chord `on digging it` interceptor) — the standard digging action never
 * mutates state itself. An entity with this trait and no registered
 * implementation is an authoring error (load-time in Chord; runtime
 * safety-net refusal otherwise).
 *
 * This trait contains only data; the tool check is the shared
 * tool-requirement resolver's.
 */
export class DiggableTrait implements ITrait, IDiggableData {
  static readonly type = TraitType.DIGGABLE;
  readonly type = TraitType.DIGGABLE;

  toolRequirement?: ToolRequirement;

  constructor(data: IDiggableData = {}) {
    this.toolRequirement = data.toolRequirement;
  }
}
