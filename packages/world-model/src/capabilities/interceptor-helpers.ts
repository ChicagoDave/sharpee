/**
 * Interceptor Helpers (ADR-118)
 *
 * Helper functions for working with trait interceptors.
 * Mirrors capability-helpers.ts pattern but for interceptors.
 */

import { ITrait, ITraitConstructor } from '../traits/trait';
import { IFEntity } from '../entities';

/**
 * Find a trait on the entity that has an interceptor registered for the given action.
 *
 * Note: This checks both the static `interceptors` declaration on the trait class
 * AND the registry. Use this when you need the trait instance.
 *
 * @param entity - The entity to search
 * @param actionId - The action ID to find
 * @returns The trait that has an interceptor registered, or undefined
 *
 * @example
 * ```typescript
 * const trait = findTraitWithInterceptor(boat, 'if.action.entering');
 * if (trait) {
 *   // Entity has an interceptor for entering
 * }
 * ```
 */
export function findTraitWithInterceptor(
  entity: IFEntity,
  actionId: string
): ITrait | undefined {
  for (const trait of entity.traits.values()) {
    // First check static declaration (if available)
    const traitClass = trait.constructor as ITraitConstructor;
    if (traitClass.interceptors?.includes(actionId)) {
      return trait;
    }
  }
  return undefined;
}

/**
 * Check if an entity has any trait declaring an interceptor for an action.
 *
 * @param entity - The entity to check
 * @param actionId - The action ID to check for
 * @returns True if entity has a trait with this interceptor
 *
 * @example
 * ```typescript
 * if (hasInterceptor(entity, 'if.action.entering')) {
 *   // Entity can intercept entering actions
 * }
 * ```
 */
export function hasInterceptor(entity: IFEntity, actionId: string): boolean {
  return findTraitWithInterceptor(entity, actionId) !== undefined;
}

/**
 * Get all interceptor action IDs declared by an entity's traits.
 *
 * @param entity - The entity to inspect
 * @returns Array of action IDs the entity intercepts
 */
export function getEntityInterceptors(entity: IFEntity): string[] {
  const interceptors: string[] = [];

  for (const trait of entity.traits.values()) {
    const traitClass = trait.constructor as ITraitConstructor;
    if (traitClass.interceptors) {
      interceptors.push(...traitClass.interceptors);
    }
  }

  return interceptors;
}

/**
 * Type guard to check if a trait declares a specific interceptor.
 *
 * @param trait - The trait to check
 * @param actionId - The action ID to check for
 * @param traitType - Optional: specific trait class to narrow to
 * @returns True if trait has the interceptor (and is of specified type)
 *
 * @example
 * ```typescript
 * if (traitHasInterceptor(trait, 'if.action.entering', InflatableTrait)) {
 *   // trait is narrowed to InflatableTrait
 *   console.log(trait.isInflated);
 * }
 * ```
 */
export function traitHasInterceptor<T extends ITrait>(
  trait: ITrait,
  actionId: string,
  traitType?: new (...args: unknown[]) => T
): trait is T {
  const traitClass = trait.constructor as ITraitConstructor;
  const hasAction = traitClass.interceptors?.includes(actionId) ?? false;

  if (traitType) {
    return hasAction && trait instanceof traitType;
  }
  return hasAction;
}

/**
 * Find all traits on an entity that have interceptors.
 *
 * @param entity - The entity to inspect
 * @returns Array of traits that declare at least one interceptor
 */
export function getInterceptorTraits(entity: IFEntity): ITrait[] {
  return Array.from(entity.traits.values()).filter(trait => {
    const traitClass = trait.constructor as ITraitConstructor;
    return traitClass.interceptors && traitClass.interceptors.length > 0;
  });
}
