// packages/world-model/src/traits/cuttable/cuttableTrait.ts

import { EntityId } from '@sharpee/core';
import { ITrait } from '../trait';
import { TraitType } from '../trait-types';

/**
 * Data for the cuttable trait (ADR-230 D3c).
 *
 * Tool fields mirror ILockableData's key config (PIN 2 shared shape with
 * OpenableTrait's tool fields): a declared requirement makes the cutting
 * action refuse wrong/missing tools; no requirement means any explicit
 * tool (or none) passes validation.
 */
export interface ICuttableData {
  /** Single tool entity required to cut this (mirrors ILockableData.keyId) */
  toolId?: EntityId;

  /** Multiple tool entities that can cut this (mirrors ILockableData.keyIds) */
  toolIds?: EntityId[];
}

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
 * This trait contains only data - eligibility/tool logic is in
 * CuttableBehavior.
 */
export class CuttableTrait implements ITrait, ICuttableData {
  static readonly type = TraitType.CUTTABLE;
  readonly type = TraitType.CUTTABLE;

  toolId?: EntityId;
  toolIds?: EntityId[];

  constructor(data: ICuttableData = {}) {
    this.toolId = data.toolId;
    this.toolIds = data.toolIds;
  }
}
