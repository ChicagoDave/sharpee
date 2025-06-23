// packages/stdlib/tests/handlers/close-handler.test.ts

import { CloseHandler } from '../../src/handlers/close-handler';
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

describe('CloseHandler', () => {
  let closeHandler: CloseHandler;
  let playerEntity: Entity;
  let roomEntity: Entity;
  let openContainer: Entity;
  let closedContainer: Entity;
  let unopenableItem: Entity;
  let openDoor: Entity;
  let mockContext: GameContext;

  beforeEach(() => {
    closeHandler = new CloseHandler();
    
    // Create mock entities
    playerEntity = createMockEntity('player_1', {
      name: 'Player',
      type: 'player'
    });
    
    roomEntity = createMockEntity('room_1', {
      name: 'Test Room',
      description: 'This is a test room.',
      type: 'location'
    }, {
      [RelationshipType.CONTAINS]: ['player_1', 'container_1', 'container_2', 'item_1', 'door_1']
    });
    
    openContainer = createMockEntity('container_1', {
      name: 'Open Container',
      description: 'This container is open.',
      type: 'container',
      openable: true,
      open: true
    });
    
    closedContainer = createMockEntity('container_2', {
      name: 'Closed Container',
      description: 'This container is already closed.',
      type: 'container',
      openable: true,
      open: false
    });
    
    unopenableItem = createMockEntity('item_1', {
      name: 'Regular Item',
      description: 'This item cannot be closed.',
      type: 'item',
      openable: false
    });
    
    openDoor = createMockEntity('door_1', {
      name: 'Open Door',
      description: 'A door that is currently open.',
      type: 'door',
      openable: true,
      open: true,
      accessible: true
    });
    
    // Set up the context
    mockContext = createMockGameContext(
      playerEntity,
      roomEntity,
      {
        'container_1': openContainer,
        'container_2': closedContainer,
        'item_1': unopenableItem,
        'door_1': openDoor
      }
    );
  });

  describe('execute', () => {
    it('should close an open container', () => {
      const command: ParsedCommand = {
        verb: 'close',
        directObject: 'open container',
        originalText: 'close open container'
      };
      
      const result = closeHandler.execute(command, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      
      const event = result.events[0];
      expect(event.type).toBe(StandardEventTypes.ITEM_CLOSED);
      expect(event.payload.itemName).toBe('Open Container');
      expect(event.payload.itemId).toBe('container_1');
      
      // Check that the container was closed
      if (result.context) {
        const updatedContainer = result.context.getEntity('container_1');
        expect(updatedContainer?.attributes.open).toBe(false);
      } else {
        fail('Result context should be defined');
      }
    });
    
    it('should fail to close an unopenable item', () => {
      const command: ParsedCommand = {
        verb: 'close',
        directObject: 'regular item',
        originalText: 'close regular item'
      };
      
      const result = closeHandler.execute(command, mockContext);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain("can't close the Regular Item");
    });
    
    it('should fail to close an already closed container', () => {
      const command: ParsedCommand = {
        verb: 'close',
        directObject: 'closed container',
        originalText: 'close closed container'
      };
      
      const result = closeHandler.execute(command, mockContext);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain("already closed");
    });
    
    it('should close a door and make it inaccessible', () => {
      const command: ParsedCommand = {
        verb: 'close',
        directObject: 'open door',
        originalText: 'close open door'
      };
      
      const result = closeHandler.execute(command, mockContext);
      
      expect(result.success).toBe(true);
      
      // Check that the door was closed and made inaccessible
      if (result.context) {
        const updatedDoor = result.context.getEntity('door_1');
        expect(updatedDoor?.attributes.open).toBe(false);
        expect(updatedDoor?.attributes.accessible).toBe(false);
      } else {
        fail('Result context should be defined');
      }
    });
    
    it('should fail when trying to close a non-existent item', () => {
      const command: ParsedCommand = {
        verb: 'close',
        directObject: 'non-existent item',
        originalText: 'close non-existent item'
      };
      
      const result = closeHandler.execute(command, mockContext);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain("don't see any non-existent item");
    });
  });

  describe('validate', () => {
    it('should validate close command with direct object', () => {
      const command: ParsedCommand = {
        verb: 'close',
        directObject: 'open container',
        originalText: 'close open container'
      };
      
      const result = closeHandler.validate(command, mockContext);
      
      expect(result.valid).toBe(true);
    });
    
    it('should invalidate close command without direct object', () => {
      const command: ParsedCommand = {
        verb: 'close',
        originalText: 'close'
      };
      
      const result = closeHandler.validate(command, mockContext);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('What do you want to close?');
    });
  });

  describe('synonyms', () => {
    it('should handle "shut" as a synonym for "close"', () => {
      const command: ParsedCommand = {
        verb: 'shut',
        directObject: 'open container',
        originalText: 'shut open container'
      };
      
      const result = closeHandler.execute(command, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.events[0].type).toBe(StandardEventTypes.ITEM_CLOSED);
    });
    
    it('should handle "seal" as a synonym for "close"', () => {
      const command: ParsedCommand = {
        verb: 'seal',
        directObject: 'open container',
        originalText: 'seal open container'
      };
      
      const result = closeHandler.execute(command, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.events[0].type).toBe(StandardEventTypes.ITEM_CLOSED);
    });
  });
});
