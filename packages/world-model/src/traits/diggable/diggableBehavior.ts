// packages/world-model/src/traits/diggable/diggableBehavior.ts

import { EntityId } from '@sharpee/core';
import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { TraitType } from '../trait-types';
import { DiggableTrait } from './diggableTrait';

/**
 * Behavior for diggable entities (ADR-230 Phase 6 (sketch ruling 6)).
 *
 * Pure predicates only — the digging action's validate() consults these;
 * the cut mutation itself belongs to the entity's registered
 * implementation, never here.
 */
export class DiggableBehavior extends Behavior {
  static requiredTraits = [TraitType.DIGGABLE];

  /**
   * Check if this entity requires a tool to cut (mirrors
   * LockableBehavior.requiresKey / OpenableBehavior.requiresTool)
   */
  static requiresTool(entity: IFEntity): boolean {
    const diggable = DiggableBehavior.require<DiggableTrait>(entity, TraitType.DIGGABLE);
    return !!(diggable.toolId || diggable.toolIds?.length);
  }

  /**
   * Check if a tool can cut this entity (mirrors LockableBehavior.canUnlockWith)
   */
  static canDigWith(entity: IFEntity, toolId: EntityId): boolean {
    const diggable = DiggableBehavior.require<DiggableTrait>(entity, TraitType.DIGGABLE);

    if (diggable.toolId === toolId) {
      return true;
    }

    if (diggable.toolIds && diggable.toolIds.includes(toolId)) {
      return true;
    }

    return false;
  }
}
