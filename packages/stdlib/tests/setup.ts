// packages/stdlib/tests/setup.ts

// Common test setup and utilities for the standard library tests

import { Entity, EntityId, RelationshipType, GameContext } from '@sharpee/core';

/**
 * Create a mock entity for testing
 */
export const createMockEntity = (
  id: string, 
  attributes: Record<string, any> = {}, 
  relationships: Record<string, EntityId[]> = {}
): Entity => ({
  id,
  type: attributes.type || 'item',
  attributes,
  relationships
});

/**
 * Create a mock game context for testing
 */
export const createMockGameContext = (
  playerEntity: Entity,
  locationEntity: Entity,
  entities: Record<string, Entity> = {},
  commandHandlers: Record<string, any> = {}
): GameContext => {
  const allEntities = {
    ...entities,
    [playerEntity.id]: playerEntity,
    [locationEntity.id]: locationEntity
  };

  return {
    player: playerEntity,
    currentLocation: locationEntity,
    getEntity: (id: string) => allEntities[id],
    findEntityByName: (name: string, options = {}) => {
      return Object.values(allEntities).find(e => 
        (e.attributes.name as string)?.toLowerCase() === name.toLowerCase()
      );
    },
    getCommandHandler: (name: string) => commandHandlers[name],
    isVisible: (id: string) => allEntities[id]?.attributes.visible !== false,
    isAccessible: (id: string) => allEntities[id]?.attributes.accessible !== false,
    updateWorldState: (fn: any) => {
      const newState = { 
        entities: allEntities,
        meta: { currentLocation: locationEntity.id }
      };
      const updatedState = fn(newState);
      
      // Update the currentLocation reference
      const updatedLocationId = updatedState.meta.currentLocation;
      
      return createMockGameContext(
        updatedState.entities[playerEntity.id],
        updatedState.entities[updatedLocationId],
        updatedState.entities,
        commandHandlers
      );
    }
  } as GameContext;
};

/**
 * Mock standard event types for testing
 */
export const MockEventTypes = {
  ITEM_EXAMINED: 'ITEM_EXAMINED',
  ITEM_TAKEN: 'ITEM_TAKEN',
  ITEM_DROPPED: 'ITEM_DROPPED',
  ITEM_OPENED: 'ITEM_OPENED',
  ITEM_CLOSED: 'ITEM_CLOSED',
  ITEM_USED: 'ITEM_USED',
  PLAYER_MOVED: 'PLAYER_MOVED',
  PLAYER_WAITED: 'PLAYER_WAITED',
  INVENTORY_CHECKED: 'INVENTORY_CHECKED',
  INVENTORY_LISTED: 'INVENTORY_LISTED'
};

/**
 * Mock standard event tags for testing
 */
export const MockEventTags = {
  VISIBLE: 'VISIBLE',
  PRIVATE: 'PRIVATE',
  SYSTEM: 'SYSTEM'
};
