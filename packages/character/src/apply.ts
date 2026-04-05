/**
 * Apply compiled character data to an entity (ADR-141)
 *
 * Convenience function that creates a CharacterModelTrait from compiled
 * builder output, registers custom predicates, and adds the trait to
 * the entity.
 *
 * Public interface: applyCharacter.
 * Owner context: @sharpee/character
 */

import {
  IFEntity,
  CharacterModelTrait,
} from '@sharpee/world-model';
import { CompiledCharacter } from './character-builder';

/**
 * Apply a compiled character to an entity.
 *
 * Creates the CharacterModelTrait, registers custom predicates,
 * and adds the trait to the entity. Returns the trait for further
 * programmatic manipulation if needed.
 *
 * @param entity - The NPC entity to apply the character model to
 * @param compiled - Output of CharacterBuilder.compile()
 * @returns The created CharacterModelTrait instance
 */
export function applyCharacter(
  entity: IFEntity,
  compiled: CompiledCharacter,
): CharacterModelTrait {
  const trait = new CharacterModelTrait(compiled.traitData);

  // Register custom predicates
  for (const [name, fn] of compiled.customPredicates) {
    trait.registerPredicate(name, fn);
  }

  // Add trait to entity
  entity.add(trait);

  return trait;
}
