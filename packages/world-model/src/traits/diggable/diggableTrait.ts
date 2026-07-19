// packages/world-model/src/traits/diggable/diggableTrait.ts

import { EntityId } from '@sharpee/core';
import { ITrait } from '../trait.js';
import { TraitType } from '../trait-types.js';

/**
 * Data for the diggable trait (ADR-230 Phase 6 (sketch ruling 6)).
 *
 * Tool fields mirror ILockableData's key config (PIN 2 shared shape with
 * OpenableTrait's tool fields): a declared requirement makes the digging
 * action refuse wrong/missing tools; no requirement means any explicit
 * tool (or none) passes validation.
 */
export interface IDiggableData {
  /** Single tool entity required to dig this (mirrors ILockableData.keyId) */
  toolId?: EntityId;

  /** Multiple tool entities that can dig this (mirrors ILockableData.keyIds) */
  toolIds?: EntityId[];
}

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
 * This trait contains only data - eligibility/tool logic is in
 * DiggableBehavior.
 */
export class DiggableTrait implements ITrait, IDiggableData {
  static readonly type = TraitType.DIGGABLE;
  readonly type = TraitType.DIGGABLE;

  toolId?: EntityId;
  toolIds?: EntityId[];

  constructor(data: IDiggableData = {}) {
    this.toolId = data.toolId;
    this.toolIds = data.toolIds;
  }
}
