// packages/stdlib/tests/handlers/take-handler.test.ts

import { TakeHandler } from '../../src/handlers/take-handler';
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
    isVisible: (id: string) => true,
    isAccessible: (id: string) => allEntities[id]?.attributes.accessible !== false,
    updateWorldState: (fn: any) => {
      const newState = { 
        entities: allEntities,
        meta: { currentLocation: locationEntity.id }
      };
      const updatedState = fn(newState);
      
      return createMockGameContext(
        updatedState.entities[playerEntity.id],
        updatedState.entities[locationEntity.id],
        updatedState.entities,
        commandHandlers
      );
    }
  } as GameContext;
};

describe('TakeHandler', () => {
  let takeHandler: TakeHandler;
  let playerEntity: Entity;
  let roomEntity: Entity;
  let takeableItem: Entity;
  let untakeableItem: Entity;
  let inventoryItem: Entity;
  let mockContext: GameContext;
  let mockInventoryHandler: any;

  beforeEach(() => {
    takeHandler = new TakeHandler();
    
    // Create mock entities
    playerEntity = createMockEntity('player_1', {
      name: 'Player',
      type: 'player'
    }, {
      [RelationshipType.CONTAINS]: ['item_3'] // Already in inventory
    });
    
    roomEntity = createMockEntity('room_1', {
      name: 'Test Room',
      description: 'This is a test room.',
      type: 'location'
    }, {
      [RelationshipType.CONTAINS]: ['player_1', 'item_1', 'item_2']
    });
    
    takeableItem = createMockEntity('item_1', {
      name: 'Takeable Item',
      description: 'This is a takeable item.',
      takeable: true
    });
    
    untakeableItem = createMockEntity('item_2', {
      name: 'Fixed Item',
      description: 'This item cannot be taken.',
      takeable: false
    });
    
    inventoryItem = createMockEntity('item_3', {
      name: 'Inventory Item',
      description: 'This item is already in your inventory.',
      takeable: true
    });
    
    // Mock inventory handler for "take inventory" command
    mockInventoryHandler = {
      execute: jest.fn(() => ({
        success: true,
        events: [{
          id: 'inventory_event_1',
          type: StandardEventTypes.INVENTORY_LISTED,
          payload: {
            items: [inventoryItem]
          },
          metadata: {
            tags: [StandardEventTags.VISIBLE]
          }
        }]
      }))
    };
    
    // Set up the context
    mockContext = createMockGameContext(
      playerEntity,
      roomEntity,
      {
        'item_1': takeableItem,
        'item_2': untakeableItem,
        'item_3': inventoryItem
      },
      {
        'inventory': mockInventoryHandler
      }
    );
  });

  describe('execute', () => {
    it('should take a takeable item', () => {
      const command: ParsedCommand = {
        verb: 'take',
        directObject: 'takeable item',
        originalText: 'take takeable item'
      };
      
      const result = takeHandler.execute(command, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      
      const event = result.events[0];
      expect(event.type).toBe(StandardEventTypes.ITEM_TAKEN);
      expect(event.payload.itemName).toBe('Takeable Item');
      expect(event.payload.itemId).toBe('item_1');
      
      // Check the item was moved to inventory
      if (result.context) {
        const updatedPlayer = result.context.player;
        const playerContains = updatedPlayer.relationships[RelationshipType.CONTAINS] || [];
        expect(playerContains).toContain('item_1');
        
        const updatedRoom = result.context.currentLocation;
        const roomContains = updatedRoom.relationships[RelationshipType.CONTAINS] || [];
        expect(roomContains).not.toContain('item_1');
      } else {
        fail('Result context should be defined');
      }
    });
    
    it('should fail to take an untakeable item', () => {
      const command: ParsedCommand = {
        verb: 'take',
        directObject: 'fixed item',
        originalText: 'take fixed item'
      };
      
      const result = takeHandler.execute(command, mockContext);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain("can't take the Fixed Item");
    });
    
    it('should fail to take an item already in inventory', () => {
      const command: ParsedCommand = {
        verb: 'take',
        directObject: 'inventory item',
        originalText: 'take inventory item'
      };
      
      const result = takeHandler.execute(command, mockContext);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain("already carrying");
    });
    
    it('should fail when taking a non-existent item', () => {
      const command: ParsedCommand = {
        verb: 'take',
        directObject: 'non-existent item',
        originalText: 'take non-existent item'
      };
      
      const result = takeHandler.execute(command, mockContext);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain("don't see any non-existent item");
    });
    
    it('should handle "take all" command', () => {
      const command: ParsedCommand = {
        verb: 'take',
        directObject: 'all',
        originalText: 'take all'
      };
      
      const result = takeHandler.execute(command, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.events.length).toBeGreaterThan(0);
      
      // Only takeable item should be in events
      const itemTakenEvents = result.events.filter(e => e.type === StandardEventTypes.ITEM_TAKEN);
      expect(itemTakenEvents.length).toBe(1);
      expect(itemTakenEvents[0].payload.itemId).toBe('item_1');
      
      // Check the items were moved to inventory
      if (result.context) {
        const updatedPlayer = result.context.player;
        const playerContains = updatedPlayer.relationships[RelationshipType.CONTAINS] || [];
        expect(playerContains).toContain('item_1');
        expect(playerContains).not.toContain('item_2'); // Untakeable
        expect(playerContains).toContain('item_3'); // Already in inventory
      } else {
        fail('Result context should be defined');
      }
    });
    
    it('should handle "take inventory" by redirecting to inventory handler', () => {
      const command: ParsedCommand = {
        verb: 'take',
        directObject: 'inventory',
        originalText: 'take inventory'
      };
      
      const result = takeHandler.execute(command, mockContext);
      
      expect(result.success).toBe(true);
      expect(mockInventoryHandler.execute).toHaveBeenCalled();
    });
  });

  describe('validate', () => {
    it('should validate take command with direct object', () => {
      const command: ParsedCommand = {
        verb: 'take',
        directObject: 'takeable item',
        originalText: 'take takeable item'
      };
      
      const result = takeHandler.validate(command, mockContext);
      
      expect(result.valid).toBe(true);
    });
    
    it('should invalidate take command without direct object', () => {
      const command: ParsedCommand = {
        verb: 'take',
        originalText: 'take'
      };
      
      const result = takeHandler.validate(command, mockContext);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('What do you want to take?');
    });
  });

  describe('synonyms', () => {
    it('should handle "get" as a synonym for "take"', () => {
      const command: ParsedCommand = {
        verb: 'get',
        directObject: 'takeable item',
        originalText: 'get takeable item'
      };
      
      const result = takeHandler.execute(command, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.events[0].type).toBe(StandardEventTypes.ITEM_TAKEN);
    });
    
    it('should handle "pick up" as a synonym for "take"', () => {
      const command: ParsedCommand = {
        verb: 'pick',
        directObject: 'takeable item',
        originalText: 'pick up takeable item'
      };
      
      const result = takeHandler.execute(command, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.events[0].type).toBe(StandardEventTypes.ITEM_TAKEN);
    });
  });
});
