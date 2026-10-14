/**
 * Behavior for flammable entities (ADR-371 D2).
 *
 * Pure predicates only — the burning action's validate() consults these;
 * the burn mutation itself belongs to the entity's registered
 * implementation, never here. Mirrors CuttableBehavior.
 *
 * Public interface: FlammableBehavior.
 * Owner context: @sharpee/world-model / traits
 */

import { type EntityId } from '@sharpee/core';
import { Behavior } from '../../behaviors/behavior.js';
import { IFEntity } from '../../entities/if-entity.js';
import { TraitType } from '../trait-types.js';
import { FlammableTrait } from './flammableTrait.js';

export class FlammableBehavior extends Behavior {
  static requiredTraits = [TraitType.FLAMMABLE];

  /**
   * Whether this entity requires a tool to burn.
   * @param entity the flammable entity
   * @returns true when a tool is declared
   */
  static requiresTool(entity: IFEntity): boolean {
    const flammable = FlammableBehavior.require<FlammableTrait>(entity, TraitType.FLAMMABLE);
    return !!(flammable.toolId || flammable.toolIds?.length);
  }

  /**
   * The declared tools that burn this entity, in declaration order — empty
   * when it needs none. The implicit-instrument resolution (GH #241) reads
   * this to find a held tool the player did not name.
   * @param entity the flammable entity
   * @returns the tool ids
   */
  static requiredTools(entity: IFEntity): EntityId[] {
    const flammable = FlammableBehavior.require<FlammableTrait>(entity, TraitType.FLAMMABLE);
    return [...(flammable.toolId ? [flammable.toolId] : []), ...(flammable.toolIds ?? [])];
  }

  /**
   * Whether a tool can burn this entity.
   * @param entity the flammable entity
   * @param toolId the offered tool
   * @returns true when the tool is declared for it
   */
  static canBurnWith(entity: IFEntity, toolId: EntityId): boolean {
    const flammable = FlammableBehavior.require<FlammableTrait>(entity, TraitType.FLAMMABLE);
    return flammable.toolId === toolId || !!flammable.toolIds?.includes(toolId);
  }
}
