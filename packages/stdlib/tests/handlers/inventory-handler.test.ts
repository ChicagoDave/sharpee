// packages/stdlib/tests/handlers/inventory-handler.test.ts

import { InventoryHandler } from '../../src/handlers/inventory-handler';
import { Entity, EntityId, RelationshipType } from '@sharpee/core';
import { GameContext, CommandResult } from '@sharpee/core';
import { ParsedCommand } from '@sharpee/core';
import { StandardEventTypes, StandardEventTags } from '@sharpee/core';

// Mock entities and context
const createMockEntity = (id: string, attributes: Record<string, any> = {}, relationships: Record<string, EntityId[]> = {}): Entity => ({
  id,
  type: attributes.type || 'item',
  attributes,
  relationships
});

const createMockGameContext = (
  playerEntity: Entity,
  locationEntity: Entity,
  entities: Record<string, Entity> = {}
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
    findEntityByName: (name: string) => {
      return Object.values(allEntities).find(e => 
        (e.attributes.name as string)?.toLowerCase() === name.toLowerCase()
      );
    },
    isVisible: (id: string) => true,
    isAccessible: (id: string) => true,
    updateWorldState: (fn: any) => {
      const newState = { entities: allEntities };
      const updatedState = fn(newState);
      return createMockGameContext(
        updatedState.entities[playerEntity.id],
        updatedState.entities[locationEntity.id],
        updatedState.entities
      );
    }
  } as GameContext;
};

describe('InventoryHandler', () => {
  let inventoryHandler: InventoryHandler;
  let playerEntity: Entity;
  let roomEntity: Entity;
  let inventoryItem1: Entity;
  let inventoryItem2: Entity;
  let mockContext: GameContext;
  let emptyInventoryContext: GameContext;

  beforeEach(() => {
    inventoryHandler = new InventoryHandler();
    
    // Create mock entities
    inventoryItem1 = createMockEntity('item_1', {
      name: 'First Item',
      description: 'This is the first item in inventory.',
      type: 'item'
    });
    
    inventoryItem2 = createMockEntity('item_2', {
      name: 'Second Item',
      description: 'This is the second item in inventory.',
      type: 'item'
    });
    
    playerEntity = createMockEntity('player_1', {
      name: 'Player',
      type: 'player'
    }, {
      [RelationshipType.CONTAINS]: ['item_1', 'item_2'] // Items in inventory
    });
    
    roomEntity = createMockEntity('room_1', {
      name: 'Test Room',
      description: 'This is a test room.',
      type: 'location'
    }, {
      [RelationshipType.CONTAINS]: ['player_1']
    });
    
    // Player with empty inventory
    const emptyInventoryPlayer = createMockEntity('player_1', {
      name: 'Player',
      type: 'player'
    }, {
      [RelationshipType.CONTAINS]: [] // Empty inventory
    });
    
    // Set up the contexts
    mockContext = createMockGameContext(
      playerEntity,
      roomEntity,
      {
        'item_1': inventoryItem1,
        'item_2': inventoryItem2
      }
    );
    
    emptyInventoryContext = createMockGameContext(
      emptyInventoryPlayer,
      roomEntity,
      {}
    );
  });

  describe('execute', () => {
    it('should list items in inventory', () => {
      const command: ParsedCommand = {
        verb: 'inventory',
        originalText: 'inventory'
      };
      
      const result = inventoryHandler.execute(command, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      
      const event = result.events[0];
      expect(event.type).toBe(StandardEventTypes.INVENTORY_CHECKED);
      expect(event.payload.items).toHaveLength(2);
      expect(event.payload.isEmpty).toBe(false);
      
      // Check that the items are correctly identified
      const itemNames = event.payload.items.map(item => item.name);
      expect(itemNames).toContain('First Item');
      expect(itemNames).toContain('Second Item');
    });
    
    it('should indicate when inventory is empty', () => {
      const command: ParsedCommand = {
        verb: 'inventory',
        originalText: 'inventory'
      };
      
      const result = inventoryHandler.execute(command, emptyInventoryContext);
      
      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      
      const event = result.events[0];
      expect(event.type).toBe(StandardEventTypes.INVENTORY_CHECKED);
      expect(event.payload.items).toHaveLength(0);
      expect(event.payload.isEmpty).toBe(true);
    });
  });

  describe('synonyms', () => {
    it('should handle "i" as a synonym for "inventory"', () => {
      const command: ParsedCommand = {
        verb: 'i',
        originalText: 'i'
      };
      
      const result = inventoryHandler.execute(command, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.events[0].type).toBe(StandardEventTypes.INVENTORY_CHECKED);
    });
    
    it('should handle "inv" as a synonym for "inventory"', () => {
      const command: ParsedCommand = {
        verb: 'inv',
        originalText: 'inv'
      };
      
      const result = inventoryHandler.execute(command, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.events[0].type).toBe(StandardEventTypes.INVENTORY_CHECKED);
    });
  });
});
