// packages/world-model/src/behaviors/behavior.ts

import { IFEntity } from '../entities/if-entity';
import { TraitType } from '../traits/trait-types';
import { Trait } from '../traits/trait';

/**
 * Base class for all behaviors in the IF system.
 * 
 * Behaviors contain the logic that operates on trait data.
 * They declare their required traits and provide helper methods
 * for safely accessing those traits.
 * 
 * Note: In the new architecture, behaviors are primarily static
 * utility classes rather than instantiated objects.
 */
export abstract class Behavior {
  /**
   * List of trait types that must be present on an entity
   * for this behavior to function properly.
   * 
   * Example:
   * static requiredTraits = [TraitType.LOCKABLE, TraitType.OPENABLE];
   */
  static requiredTraits: (TraitType | string)[] = [];

  /**
   * Helper method to require and retrieve a trait from an entity.
   * Throws an error if the trait is not present.
   * 
   * @param entity - The entity to get the trait from
   * @param traitType - The type of trait to retrieve
   * @returns The trait instance
   * @throws Error if the trait is not present on the entity
   */
  protected static require<T extends Trait>(
    entity: IFEntity,
    traitType: TraitType | string
  ): T {
    if (!entity.has(traitType)) {
      throw new Error(
        `Entity "${entity.id}" missing required trait: ${traitType}`
      );
    }
    return entity.get(traitType) as T;
  }

  /**
   * Helper method to optionally retrieve a trait from an entity.
   * Returns undefined if the trait is not present.
   * 
   * @param entity - The entity to get the trait from
   * @param traitType - The type of trait to retrieve
   * @returns The trait instance or undefined
   */
  protected static optional<T extends Trait>(
    entity: IFEntity,
    traitType: TraitType | string
  ): T | undefined {
    if (!entity.has(traitType)) {
      return undefined;
    }
    return entity.get(traitType) as T;
  }

  /**
   * Validates that an entity has all required traits for this behavior.
   * 
   * @param entity - The entity to validate
   * @returns true if all required traits are present
   */
  static validateEntity(entity: IFEntity): boolean {
    return this.requiredTraits.every(trait => entity.has(trait));
  }

  /**
   * Gets a list of missing required traits for an entity.
   * 
   * @param entity - The entity to check
   * @returns Array of missing trait types
   */
  static getMissingTraits(entity: IFEntity): (TraitType | string)[] {
    return this.requiredTraits.filter(trait => !entity.has(trait));
  }
}

/**
 * Interface for behaviors that need access to the world context
 */
export interface WorldAwareBehavior {
  setWorldContext(context: any): void;
}

/**
 * Type guard to check if a behavior is world-aware
 */
export function isWorldAwareBehavior(
  behavior: any
): behavior is WorldAwareBehavior {
  return 'setWorldContext' in behavior;
}
