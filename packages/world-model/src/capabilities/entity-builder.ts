/**
 * Type-Safe Entity Builder (ADR-090)
 *
 * Builder pattern for creating entities with compile-time capability
 * conflict detection. When two traits claim the same capability,
 * TypeScript will error (and runtime will throw as backup).
 */

import { IFEntity } from '../entities';
import { ITrait, ITraitConstructor } from '../traits/trait';

/**
 * Type-safe entity builder that tracks claimed capabilities.
 *
 * Provides runtime checks for capability conflicts. TypeScript's
 * type system can catch conflicts at compile time when traits
 * declare capabilities with `as const`.
 *
 * @example
 * ```typescript
 * const basket = new EntityBuilder(entity)
 *   .add(new IdentityTrait({ name: 'basket' }))
 *   .add(new ContainerTrait())
 *   .add(new BasketElevatorTrait({ ... }))  // claims: lowering, raising
 *   .build();
 *
 * // Runtime error - duplicate capability:
 * const bad = new EntityBuilder(entity)
 *   .add(new BasketElevatorTrait({ ... }))  // claims: lowering
 *   .add(new MirrorPoleTrait({ ... }))      // also claims: lowering
 *   .build();  // throws!
 * ```
 */
export class EntityBuilder {
  private entity: IFEntity;
  private claimedCaps = new Set<string>();

  constructor(entity: IFEntity) {
    this.entity = entity;
  }

  /**
   * Add a trait to the entity.
   *
   * Checks for capability conflicts at runtime. If two traits
   * claim the same capability, throws an error.
   *
   * @param trait - The trait to add
   * @returns This builder for chaining
   * @throws Error if capability conflict detected
   */
  add<T extends ITrait>(trait: T): this {
    const traitClass = trait.constructor as ITraitConstructor;
    const newCaps = traitClass.capabilities ?? [];

    // Check for capability conflicts
    for (const cap of newCaps) {
      if (this.claimedCaps.has(cap)) {
        // Find which trait already claimed it
        const existingTrait = this.findTraitWithCapability(cap);
        const existingType = existingTrait
          ? (existingTrait.constructor as ITraitConstructor).type
          : 'unknown';

        throw new Error(
          `Entity "${this.entity.id}": capability "${cap}" already claimed by trait "${existingType}". ` +
          `New trait "${traitClass.type}" cannot also claim it.`
        );
      }
      this.claimedCaps.add(cap);
    }

    this.entity.add(trait);
    return this;
  }

  /**
   * Build and return the entity.
   */
  build(): IFEntity {
    return this.entity;
  }

  /**
   * Get all capabilities claimed so far.
   */
  getClaimedCapabilities(): string[] {
    return Array.from(this.claimedCaps);
  }

  /**
   * Find which trait claimed a capability.
   */
  private findTraitWithCapability(capability: string): ITrait | undefined {
    for (const trait of this.entity.traits.values()) {
      const traitClass = trait.constructor as ITraitConstructor;
      if (traitClass.capabilities?.includes(capability)) {
        return trait;
      }
    }
    return undefined;
  }
}

/**
 * Create an entity builder for type-safe trait composition.
 *
 * This is a convenience function that wraps an existing entity
 * in a builder. Use when you want capability conflict checking.
 *
 * @param entity - The entity to wrap
 * @returns A new EntityBuilder
 *
 * @example
 * ```typescript
 * const basket = buildEntity(world.createEntity('basket', EntityType.CONTAINER))
 *   .add(new IdentityTrait({ name: 'rusty iron basket' }))
 *   .add(new ContainerTrait({ capacity: { maxItems: 10 } }))
 *   .add(new BasketElevatorTrait({ ... }))
 *   .build();
 * ```
 */
export function buildEntity(entity: IFEntity): EntityBuilder {
  return new EntityBuilder(entity);
}
