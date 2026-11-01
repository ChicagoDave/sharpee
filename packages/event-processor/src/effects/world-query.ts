/**
 * WorldQuery: Read-only view of WorldModel for event handlers
 *
 * Per ADR-075, handlers receive a read-only query interface instead of
 * full world access. This preserves stdlib as the gatekeeper for mutations.
 */

import type { IFEntity, TraitType, ICapabilityData, IWorldModel } from '@sharpee/world-model';

/**
 * Read-only query interface for handlers
 *
 * Allows handlers to read state to make decisions, but cannot mutate directly.
 * Mutations happen through Effects processed by EffectProcessor.
 */
export interface WorldQuery {
  /**
   * Get an entity by ID
   */
  getEntity(id: string): IFEntity | undefined;

  /**
   * Check if an entity exists
   */
  hasEntity(id: string): boolean;

  /** Whether any actor holds the player role yet (ADR-390 D1). */
  readonly hasPlayerCharacter: boolean;
  /** The actor holding the player role; throws when none does (ADR-390 D1). */
  readonly playerCharacter: IFEntity;

  /**
   * Get the room the player is in
   */
  getCurrentRoom(): IFEntity | undefined;

  /**
   * Get the room an entity is in
   */
  getContainingRoom(entityId: string): IFEntity | undefined;

  /**
   * Get the location (parent) of an entity
   */
  getLocation(entityId: string): string | undefined;

  /**
   * Get contents of a container/room
   */
  getContents(containerId: string): IFEntity[];

  /**
   * Find entities by trait
   */
  findByTrait(traitType: TraitType): IFEntity[];

  /**
   * Find entities matching a predicate
   */
  findWhere(predicate: (entity: IFEntity) => boolean): IFEntity[];

  /**
   * Get a world state value
   */
  getStateValue(key: string): unknown;

  /**
   * Get a capability's data
   */
  getCapability(name: string): ICapabilityData | undefined;

  /**
   * Check if a capability exists
   */
  hasCapability(name: string): boolean;
}

/**
 * Create a WorldQuery wrapper around a WorldModel
 *
 * This provides read-only access to the world model for event handlers.
 */
export function createWorldQuery(world: IWorldModel): WorldQuery {
  return {
    getEntity: (id: string) => world.getEntity(id),
    hasEntity: (id: string) => world.hasEntity(id),
    get hasPlayerCharacter() { return world.hasPlayerCharacter; },
    get playerCharacter() { return world.playerCharacter; },
    getCurrentRoom: () => (world.hasPlayerCharacter ? world.getContainingRoom(world.playerCharacter.id) : undefined),
    getContainingRoom: (entityId: string) => world.getContainingRoom(entityId),
    getLocation: (entityId: string) => world.getLocation(entityId),
    getContents: (containerId: string) => world.getContents(containerId),
    findByTrait: (traitType: TraitType) => world.findByTrait(traitType),
    findWhere: (predicate: (entity: IFEntity) => boolean) => world.findWhere(predicate),
    getStateValue: (key: string) => world.getStateValue(key),
    getCapability: (name: string) => world.getCapability(name),
    hasCapability: (name: string) => world.hasCapability(name),
  };
}
