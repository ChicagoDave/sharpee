// packages/stdlib/tests/core-imports.ts

// Re-export the core imports for use in tests
export * from '../src/core-imports';

// Test-specific utilities
export const MockEventTypes = {
  ITEM_EXAMINED: 'item:examined',
  ITEM_TAKEN: 'item:taken',
  ITEM_DROPPED: 'item:dropped',
  ITEM_OPENED: 'item:opened',
  ITEM_CLOSED: 'item:closed',
  ITEM_USED: 'item:used',
  PLAYER_MOVED: 'player:moved',
  PLAYER_WAITED: 'player:waited',
  INVENTORY_CHECKED: 'inventory:checked',
  INVENTORY_LISTED: 'inventory:listed'
};

export const MockEventTags = {
  VISIBLE: 'visible',
  PRIVATE: 'private',
  SYSTEM: 'system'
};

// Mock entity creation helper
export const createMockEntity = (
  id: string, 
  attributes: Record<string, any> = {}, 
  relationships: Record<string, string[]> = {}
) => ({
  id,
  type: attributes.type || 'item',
  attributes,
  relationships
});

// Mock context creation helper
export const createMockGameContext = (
  playerEntity: any,
  locationEntity: any,
  entities: Record<string, any> = {},
  commandHandlers: Record<string, any> = {}
) => {
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
      return Object.values(allEntities).find((e: any) => 
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
        updatedState.entities[updatedLocationId || locationEntity.id],
        updatedState.entities,
        commandHandlers
      );
    }
  };
};
