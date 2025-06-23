// packages/stdlib/tests/handlers/drop-handler.test.ts

import { DropHandler } from '../../src/handlers/drop-handler';
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
    findEntityByName: (name: string, options = {}) => {
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

describe('DropHandler', () => {
  let dropHandler: DropHandler;
  let playerEntity: Entity;
  let roomEntity: Entity;
  let inventoryItem1: Entity;
  let inventoryItem2: Entity;
  let mockContext: GameContext;

  beforeEach(() => {
    dropHandler = new DropHandler();
    
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
    
    // Set up the context
    mockContext = createMockGameContext(
      playerEntity,
      roomEntity,
      {
        'item_1': inventoryItem1,
        'item_2': inventoryItem2
      }
    );
  });

  describe('execute', () => {
    it('should drop an item from inventory', () => {
      const command: ParsedCommand = {
        verb: 'drop',
        directObject: 'first item',
        originalText: 'drop first item'
      };
      
      const result = dropHandler.execute(command, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      
      const event = result.events[0];
      expect(event.type).toBe(StandardEventTypes.ITEM_DROPPED);
      expect(event.payload.itemName).toBe('First Item');
      expect(event.payload.itemId).toBe('item_1');
      
      // Check the item was moved to the room
      if (result.context) {
        const updatedPlayer = result.context.player;
        const playerContains = updatedPlayer.relationships[RelationshipType.CONTAINS] || [];
        expect(playerContains).not.toContain('item_1');
        
        const updatedRoom = result.context.currentLocation;
        const roomContains = updatedRoom.relationships[RelationshipType.CONTAINS] || [];
        expect(roomContains).toContain('item_1');
      } else {
        fail('Result context should be defined');
      }
    });
    
    it('should fail when trying to drop an item not in inventory', () => {
      // Create a non-inventory item
      const roomItem = createMockEntity('item_3', {
        name: 'Room Item',
        description: 'This item is in the room, not in inventory.',
        type: 'item'
      });
      
      // Add to room
      const updatedRoom = {
        ...roomEntity,
        relationships: {
          ...roomEntity.relationships,
          [RelationshipType.CONTAINS]: [
            ...(roomEntity.relationships[RelationshipType.CONTAINS] || []),
            'item_3'
          ]
        }
      };
      
      // Update context
      const updatedContext = createMockGameContext(
        playerEntity,
        updatedRoom,
        {
          ...mockContext.getEntity('item_1') ? { 'item_1': inventoryItem1 } : {},
          ...mockContext.getEntity('item_2') ? { 'item_2': inventoryItem2 } : {},
          'item_3': roomItem
        }
      );
      
      const command: ParsedCommand = {
        verb: 'drop',
        directObject: 'room item',
        originalText: 'drop room item'
      };
      
      const result = dropHandler.execute(command, updatedContext);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain("don't have the Room Item");
    });
    
    it('should fail when trying to drop a non-existent item', () => {
      const command: ParsedCommand = {
        verb: 'drop',
        directObject: 'non-existent item',
        originalText: 'drop non-existent item'
      };
      
      const result = dropHandler.execute(command, mockContext);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain("don't have any non-existent item");
    });
    
    it('should handle "drop all" command', () => {
      const command: ParsedCommand = {
        verb: 'drop',
        directObject: 'all',
        originalText: 'drop all'
      };
      
      const result = dropHandler.execute(command, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.events.length).toBe(2); // One for each inventory item
      
      // Check that all items were dropped
      if (result.context) {
        const updatedPlayer = result.context.player;
        const playerContains = updatedPlayer.relationships[RelationshipType.CONTAINS] || [];
        expect(playerContains.length).toBe(0);
        
        const updatedRoom = result.context.currentLocation;
        const roomContains = updatedRoom.relationships[RelationshipType.CONTAINS] || [];
        expect(roomContains).toContain('item_1');
        expect(roomContains).toContain('item_2');
      } else {
        fail('Result context should be defined');
      }
    });
    
    it('should fail with "drop all" when inventory is empty', () => {
      // Create player with empty inventory
      const emptyPlayer = createMockEntity('player_1', {
        name: 'Player',
        type: 'player'
      }, {
        [RelationshipType.CONTAINS]: []
      });
      
      // Update context
      const emptyContext = createMockGameContext(
        emptyPlayer,
        roomEntity,
        {}
      );
      
      const command: ParsedCommand = {
        verb: 'drop',
        directObject: 'all',
        originalText: 'drop all'
      };
      
      const result = dropHandler.execute(command, emptyContext);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain("not carrying anything");
    });
  });

  describe('validate', () => {
    it('should validate drop command with direct object', () => {
      const command: ParsedCommand = {
        verb: 'drop',
        directObject: 'first item',
        originalText: 'drop first item'
      };
      
      const result = dropHandler.validate(command, mockContext);
      
      expect(result.valid).toBe(true);
    });
    
    it('should invalidate drop command without direct object', () => {
      const command: ParsedCommand = {
        verb: 'drop',
        originalText: 'drop'
      };
      
      const result = dropHandler.validate(command, mockContext);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('What do you want to drop?');
    });
  });

  describe('synonyms', () => {
    it('should handle "discard" as a synonym for "drop"', () => {
      const command: ParsedCommand = {
        verb: 'discard',
        directObject: 'first item',
        originalText: 'discard first item'
      };
      
      const result = dropHandler.execute(command, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.events[0].type).toBe(StandardEventTypes.ITEM_DROPPED);
    });
    
    it('should handle "leave" as a synonym for "drop"', () => {
      const command: ParsedCommand = {
        verb: 'leave',
        directObject: 'first item',
        originalText: 'leave first item'
      };
      
      const result = dropHandler.execute(command, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.events[0].type).toBe(StandardEventTypes.ITEM_DROPPED);
    });
  });
});
