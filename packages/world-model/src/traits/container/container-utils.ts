// packages/world-model/src/traits/container/container-utils.ts

import { ITrait } from '../trait';
import { TraitType } from '../trait-types';
import { IFEntity } from '../../entities/if-entity';

/**
 * Interface for traits that provide container functionality.
 * This includes ContainerTrait, RoomTrait, and ActorTrait.
 */
export interface IContainerCapable extends ITrait {
  /** Capacity constraints */
  capacity?: {
    maxWeight?: number;
    maxVolume?: number;
    maxItems?: number;
  };
  
  /** Whether contents are visible when the container is closed */
  isTransparent: boolean;
  
  /** Whether actors can enter this container */
  enterable: boolean;
  
  /** Only these entity types can be placed in the container */
  allowedTypes?: string[];
  
  /** These entity types cannot be placed in the container */
  excludedTypes?: string[];
}

/**
 * Check if a trait provides container functionality
 */
export function isContainerCapable(trait: ITrait): trait is IContainerCapable {
  return (
    trait.type === TraitType.CONTAINER ||
    trait.type === TraitType.ROOM ||
    trait.type === TraitType.ACTOR
  );
}

/**
 * Check if an entity can contain other entities
 */
export function canContain(entity: IFEntity): boolean {
  // Check by entity type first (rooms and actors are containers by default)
  if (entity.type === 'room' || entity.type === 'actor') {
    return true;
  }
  
  // Then check for explicit container traits
  return (
    entity.hasTrait(TraitType.CONTAINER) ||
    entity.hasTrait(TraitType.ROOM) ||
    entity.hasTrait(TraitType.ACTOR) ||
    entity.hasTrait(TraitType.SUPPORTER) || // Supporters can also hold things
    entity.hasTrait(TraitType.ENTERABLE) ||
    entity.hasTrait(TraitType.VEHICLE)
  );
}

/**
 * Get the container trait from an entity, regardless of which trait provides it
 */
export function getContainerTrait(entity: IFEntity): IContainerCapable | undefined {
  // Check for explicit container trait first
  const container = entity.getTrait(TraitType.CONTAINER);
  if (container && isContainerCapable(container)) {
    return container;
  }
  
  // Check for room trait
  const room = entity.getTrait(TraitType.ROOM);
  if (room && isContainerCapable(room)) {
    return room;
  }
  
  // Check for actor trait
  const actor = entity.getTrait(TraitType.ACTOR);
  if (actor && isContainerCapable(actor)) {
    return actor;
  }
  
  // For entities without traits, provide default container capabilities based on type
  if (entity.type === 'room' || entity.type === 'actor') {
    // Return a default container capability
    return {
      type: entity.type === 'room' ? TraitType.ROOM : TraitType.ACTOR,
      isTransparent: entity.type === 'room', // Rooms are transparent by default
      enterable: entity.type === 'room', // Only rooms are enterable
      capacity: undefined // No capacity limits by default
    } as IContainerCapable;
  }
  
  return undefined;
}

/**
 * Type guard to check if a trait has container properties
 */
export function hasContainerProperties(trait: any): trait is IContainerCapable {
  return (
    typeof trait === 'object' &&
    trait !== null &&
    typeof trait.isTransparent === 'boolean' &&
    typeof trait.enterable === 'boolean'
  );
}
