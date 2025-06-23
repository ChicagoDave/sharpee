// packages/stdlib/tests/handlers/open-handler.test.ts

import { OpenHandler } from '../../src/handlers/open-handler';
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

describe('OpenHandler', () => {
  let openHandler: OpenHandler;
  let playerEntity: Entity;
  let roomEntity: Entity;
  let openableContainer: Entity;
  let unopenableItem: Entity;
  let alreadyOpenContainer: Entity;
  let lockedContainer: Entity;
  let door: Entity;
  let mockContext: GameContext;

  beforeEach(() => {
    openHandler = new OpenHandler();
    
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
      [RelationshipType.CONTAINS]: ['player_1', 'container_1', 'item_1', 'container_2', 'container_3', 'door_1']
    });
    
    openableContainer = createMockEntity('container_1', {
      name: 'Openable Container',
      description: 'This container can be opened.',
      type: 'container',
      openable: true,
      open: false
    });
    
    unopenableItem = createMockEntity('item_1', {
      name: 'Regular Item',
      description: 'This item cannot be opened.',
      type: 'item',
      openable: false
    });
    
    alreadyOpenContainer = createMockEntity('container_2', {
      name: 'Open Container',
      description: 'This container is already open.',
      type: 'container',
      openable: true,
      open: true
    });
    
    lockedContainer = createMockEntity('container_3', {
      name: 'Locked Container',
      description: 'This container is locked.',
      type: 'container',
      openable: true,
      open: false,
      locked: true
    });
    
    door = createMockEntity('door_1', {
      name: 'Door',
      description: 'A door leading somewhere.',
      type: 'door',
      openable: true,
      open: false,
      locked: false,
      accessible: false
    });
    
    // Set up the context
    mockContext = createMockGameContext(
      playerEntity,
      roomEntity,
      {
        'container_1': openableContainer,
        'item_1': unopenableItem,
        'container_2': alreadyOpenContainer,
        'container_3': lockedContainer,
        'door_1': door
      }
    );
  });

  describe('execute', () => {
    it('should open an openable container', () => {
      const command: ParsedCommand = {
        verb: 'open',
        directObject: 'openable container',
        originalText: 'open openable container'
      };
      
      const result = openHandler.execute(command, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      
      const event = result.events[0];
      expect(event.type).toBe(StandardEventTypes.ITEM_OPENED);
      expect(event.payload.itemName).toBe('Openable Container');
      expect(event.payload.itemId).toBe('container_1');
      
      // Check that the container was opened
      if (result.context) {
        const updatedContainer = result.context.getEntity('container_1');
        expect(updatedContainer?.attributes.open).toBe(true);
      } else {
        fail('Result context should be defined');
      }
    });
    
    it('should fail to open an unopenable item', () => {
      const command: ParsedCommand = {
        verb: 'open',
        directObject: 'regular item',
        originalText: 'open regular item'
      };
      
      const result = openHandler.execute(command, mockContext);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain("can't open the Regular Item");
    });
    
    it('should fail to open an already open container', () => {
      const command: ParsedCommand = {
        verb: 'open',
        directObject: 'open container',
        originalText: 'open open container'
      };
      
      const result = openHandler.execute(command, mockContext);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain("already open");
    });
    
    it('should fail to open a locked container', () => {
      const command: ParsedCommand = {
        verb: 'open',
        directObject: 'locked container',
        originalText: 'open locked container'
      };
      
      const result = openHandler.execute(command, mockContext);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain("locked");
    });
    
    it('should open a door and make it accessible', () => {
      const command: ParsedCommand = {
        verb: 'open',
        directObject: 'door',
        originalText: 'open door'
      };
      
      const result = openHandler.execute(command, mockContext);
      
      expect(result.success).toBe(true);
      
      // Check that the door was opened and made accessible
      if (result.context) {
        const updatedDoor = result.context.getEntity('door_1');
        expect(updatedDoor?.attributes.open).toBe(true);
        expect(updatedDoor?.attributes.accessible).toBe(true);
      } else {
        fail('Result context should be defined');
      }
    });
    
    it('should fail when trying to open a non-existent item', () => {
      const command: ParsedCommand = {
        verb: 'open',
        directObject: 'non-existent item',
        originalText: 'open non-existent item'
      };
      
      const result = openHandler.execute(command, mockContext);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain("don't see any non-existent item");
    });
  });

  describe('validate', () => {
    it('should validate open command with direct object', () => {
      const command: ParsedCommand = {
        verb: 'open',
        directObject: 'openable container',
        originalText: 'open openable container'
      };
      
      const result = openHandler.validate(command, mockContext);
      
      expect(result.valid).toBe(true);
    });
    
    it('should invalidate open command without direct object', () => {
      const command: ParsedCommand = {
        verb: 'open',
        originalText: 'open'
      };
      
      const result = openHandler.validate(command, mockContext);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('What do you want to open?');
    });
  });

  describe('synonyms', () => {
    it('should handle "unseal" as a synonym for "open"', () => {
      const command: ParsedCommand = {
        verb: 'unseal',
        directObject: 'openable container',
        originalText: 'unseal openable container'
      };
      
      const result = openHandler.execute(command, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.events[0].type).toBe(StandardEventTypes.ITEM_OPENED);
    });
    
    it('should handle "unlock" as a synonym for "open"', () => {
      const command: ParsedCommand = {
        verb: 'unlock',
        directObject: 'openable container',
        originalText: 'unlock openable container'
      };
      
      const result = openHandler.execute(command, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.events[0].type).toBe(StandardEventTypes.ITEM_OPENED);
    });
  });
});
