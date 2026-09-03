// packages/world-model/src/traits/cuttable/cuttableBehavior.ts

import { type EntityId } from '@sharpee/core';
import { Behavior } from '../../behaviors/behavior.js';
import { IFEntity } from '../../entities/if-entity.js';
import { TraitType } from '../trait-types.js';
import { CuttableTrait } from './cuttableTrait.js';

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
   * The declared tools that cut this entity, in declaration order —
   * empty when it needs none. The implicit-instrument resolution (GH
   * #241) reads this to find a held tool the player did not name.
   */
  static requiredTools(entity: IFEntity): EntityId[] {
    const cuttable = CuttableBehavior.require<CuttableTrait>(entity, TraitType.CUTTABLE);
    return [...(cuttable.toolId ? [cuttable.toolId] : []), ...(cuttable.toolIds ?? [])];
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
