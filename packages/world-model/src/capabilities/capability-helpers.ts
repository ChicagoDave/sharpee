/**
 * Capability Helpers (ADR-090)
 *
 * Helper functions for working with trait capabilities.
 * Used by capability-dispatch actions to find and check capabilities.
 */

import { ITrait, ITraitConstructor } from '../traits/trait';
import { IFEntity } from '../entities';

/**
 * Find a trait on the entity that declares the given capability.
 *
 * Entity resolution (which entity "lower X" refers to) is handled
 * by the parser using scope math. Once resolved to a specific entity,
 * this function finds the trait that handles the action.
 *
 * @param entity - The entity to search
 * @param actionId - The action ID (capability) to find
 * @returns The trait that claims the capability, or undefined
 *
 * @example
 * ```typescript
 * const trait = findTraitWithCapability(basket, 'if.action.lowering');
 * if (trait) {
 *   const behavior = getBehaviorForCapability(trait, 'if.action.lowering');
 *   // ... dispatch to behavior
 * }
 * ```
 */
export function findTraitWithCapability(
  entity: IFEntity,
  actionId: string
): ITrait | undefined {
  for (const trait of entity.traits.values()) {
    const traitClass = trait.constructor as ITraitConstructor;
    if (traitClass.capabilities?.includes(actionId)) {
      return trait;
    }
  }
  return undefined;
}

/**
 * Check if an entity has any trait claiming a capability.
 *
 * @param entity - The entity to check
 * @param actionId - The action ID (capability) to check for
 * @returns True if entity has a trait with this capability
 *
 * @example
 * ```typescript
 * if (hasCapability(entity, 'if.action.lowering')) {
 *   // Entity can be lowered
 * }
 * ```
 */
export function hasCapability(entity: IFEntity, actionId: string): boolean {
  return findTraitWithCapability(entity, actionId) !== undefined;
}

/**
 * Get all capabilities declared by an entity's traits.
 *
 * @param entity - The entity to inspect
 * @returns Array of action IDs the entity can handle
 */
export function getEntityCapabilities(entity: IFEntity): string[] {
  const capabilities: string[] = [];

  for (const trait of entity.traits.values()) {
    const traitClass = trait.constructor as ITraitConstructor;
    if (traitClass.capabilities) {
      capabilities.push(...traitClass.capabilities);
    }
  }

  return capabilities;
}

/**
 * Type guard to check if a trait has a specific capability.
 *
 * @param trait - The trait to check
 * @param actionId - The action ID to check for
 * @param traitType - Optional: specific trait class to narrow to
 * @returns True if trait has the capability (and is of specified type)
 *
 * @example
 * ```typescript
 * if (traitHasCapability(trait, 'if.action.lowering', BasketElevatorTrait)) {
 *   // trait is narrowed to BasketElevatorTrait
 *   console.log(trait.position);
 * }
 * ```
 */
export function traitHasCapability<T extends ITrait>(
  trait: ITrait,
  actionId: string,
  traitType?: new (...args: any[]) => T
): trait is T {
  const traitClass = trait.constructor as ITraitConstructor;
  const hasAction = traitClass.capabilities?.includes(actionId) ?? false;

  if (traitType) {
    return hasAction && trait instanceof traitType;
  }
  return hasAction;
}

/**
 * Find all traits on an entity that have capabilities.
 *
 * @param entity - The entity to inspect
 * @returns Array of traits that declare at least one capability
 */
export function getCapableTraits(entity: IFEntity): ITrait[] {
  return Array.from(entity.traits.values()).filter(trait => {
    const traitClass = trait.constructor as ITraitConstructor;
    return traitClass.capabilities && traitClass.capabilities.length > 0;
  });
}
