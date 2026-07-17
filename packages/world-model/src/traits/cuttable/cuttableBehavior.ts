// packages/world-model/src/traits/cuttable/cuttableBehavior.ts

import { EntityId } from '@sharpee/core';
import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { TraitType } from '../trait-types';
import { CuttableTrait } from './cuttableTrait';

/**
 * Behavior for cuttable entities (ADR-230 D3c).
 *
 * Pure predicates only — the cutting action's validate() consults these;
 * the cut mutation itself belongs to the entity's registered
 * implementation, never here.
 */
export class CuttableBehavior extends Behavior {
  static requiredTraits = [TraitType.CUTTABLE];

  /**
   * Check if this entity requires a tool to cut (mirrors
   * LockableBehavior.requiresKey / OpenableBehavior.requiresTool)
   */
  static requiresTool(entity: IFEntity): boolean {
    const cuttable = CuttableBehavior.require<CuttableTrait>(entity, TraitType.CUTTABLE);
    return !!(cuttable.toolId || cuttable.toolIds?.length);
  }

  /**
   * Check if a tool can cut this entity (mirrors LockableBehavior.canUnlockWith)
   */
  static canCutWith(entity: IFEntity, toolId: EntityId): boolean {
    const cuttable = CuttableBehavior.require<CuttableTrait>(entity, TraitType.CUTTABLE);

    if (cuttable.toolId === toolId) {
      return true;
    }

    if (cuttable.toolIds && cuttable.toolIds.includes(toolId)) {
      return true;
    }

    return false;
  }
}
