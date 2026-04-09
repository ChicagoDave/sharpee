/**
 * Apply compiled character data to an entity (ADR-141, 144, 145, 146)
 *
 * Convenience function that creates a CharacterModelTrait from compiled
 * builder output, registers custom predicates, and adds the trait to
 * the entity. Returns the trait plus any compiled configuration
 * (propagation, goals, movement, influence) for the NPC service.
 *
 * Public interface: applyCharacter, AppliedCharacter.
 * Owner context: @sharpee/character
 */

import {
  IFEntity,
  CharacterModelTrait,
} from '@sharpee/world-model';
import { CompiledCharacter } from './character-builder';
import { PropagationProfile } from './propagation/propagation-types';
import { GoalDef, MovementProfile } from './goals/goal-types';
import { InfluenceDef, ResistanceDef } from './influence/influence-types';

/**
 * Result of applying a compiled character to an entity.
 * Contains the trait plus any behavior configuration for the NPC service.
 */
export interface AppliedCharacter {
  /** The CharacterModelTrait added to the entity. */
  trait: CharacterModelTrait;

  /** Propagation profile (ADR-144), if defined. */
  propagationProfile?: PropagationProfile;

  /** Rich goal definitions (ADR-145), if defined. */
  goalDefs?: GoalDef[];

  /** Movement profile (ADR-145), if defined. */
  movementProfile?: MovementProfile;

  /** Influence definitions (ADR-146), if defined. */
  influenceDefs?: InfluenceDef[];

  /** Resistance definitions (ADR-146), if defined. */
  resistanceDefs?: ResistanceDef[];
}

/**
 * Apply a compiled character to an entity.
 *
 * Creates the CharacterModelTrait, registers custom predicates,
 * and adds the trait to the entity. Returns the trait plus any
 * compiled behavior configuration for the NPC service.
 *
 * @param entity - The NPC entity to apply the character model to
 * @param compiled - Output of CharacterBuilder.compile()
 * @returns The trait and compiled behavior configuration
 */
export function applyCharacter(
  entity: IFEntity,
  compiled: CompiledCharacter,
): AppliedCharacter {
  const trait = new CharacterModelTrait(compiled.traitData);

  // Register custom predicates
  for (const [name, fn] of compiled.customPredicates) {
    trait.registerPredicate(name, fn);
  }

  // Add trait to entity
  entity.add(trait);

  return {
    trait,
    propagationProfile: compiled.propagationProfile,
    goalDefs: compiled.goalDefs,
    movementProfile: compiled.movementProfile,
    influenceDefs: compiled.influenceDefs,
    resistanceDefs: compiled.resistanceDefs,
  };
}
