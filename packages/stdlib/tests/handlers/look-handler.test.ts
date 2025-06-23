// packages/stdlib/tests/handlers/look-handler.test.ts

import { LookHandler } from '../../src/handlers/look-handler';
import {
  Entity,
  EntityId,
  RelationshipType,
  GameContext,
  CommandResult,
  ParsedCommand,
  StandardEventTypes,
  StandardEventTags,
  createMockEntity,
  createMockGameContext
} from '../core-imports';

describe('LookHandler', () => {
  let lookHandler: LookHandler;
  let playerEntity: Entity;
  let locationEntity: Entity;
  let itemEntity: Entity;
  let containerEntity: Entity;
  let mockContext: GameContext;

  beforeEach(() => {
    lookHandler = new LookHandler();
    
    // Create mock entities
    playerEntity = createMockEntity('player_1', {
      name: 'Player',
      type: 'player'
    });
    
    locationEntity = createMockEntity('room_1', {
      name: 'Test Room',
      description: 'This is a test room.',
      type: 'location'
    }, {
      [RelationshipType.CONTAINS]: ['player_1', 'item_1', 'container_1']
    });
    
    itemEntity = createMockEntity('item_1', {
      name: 'Test Item',
      description: 'This is a test item.'
    });
    
    containerEntity = createMockEntity('container_1', {
      name: 'Test Container',
      description: 'This is a test container.',
      container: true,
      open: true
    }, {
      [RelationshipType.CONTAINS]: ['item_2']
    });
    
    const containedItemEntity = createMockEntity('item_2', {
      name: 'Contained Item',
      description: 'This is an item inside the container.'
    });
    
    // Set up the context
    mockContext = createMockGameContext(
      playerEntity,
      locationEntity,
      {
        'item_1': itemEntity,
        'container_1': containerEntity,
        'item_2': containedItemEntity
      }
    );
  });

  describe('execute', () => {
    it('should handle looking around (no direct object)', () => {
      const command: ParsedCommand = {
        verb: 'look',
        originalText: 'look'
      };
      
      const result = lookHandler.execute(command, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      
      const event = result.events[0];
      expect(event.type).toBe(StandardEventTypes.ITEM_EXAMINED);
      expect(event.payload.description).toBe('This is a test room.');
      expect(event.payload.visibleItems).toHaveLength(2);
      expect(event.metadata.tags).toContain(StandardEventTags.VISIBLE);
    });
    
    it('should handle looking at a specific object', () => {
      const command: ParsedCommand = {
        verb: 'look',
        directObject: 'test item',
        originalText: 'look at test item'
      };
      
      const result = lookHandler.execute(command, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      
      const event = result.events[0];
      expect(event.type).toBe(StandardEventTypes.ITEM_EXAMINED);
      expect(event.payload.itemName).toBe('Test Item');
      expect(event.payload.description).toBe('This is a test item.');
      expect(event.metadata.tags).toContain(StandardEventTags.VISIBLE);
    });
    
    it('should handle looking at a container and show contents', () => {
      const command: ParsedCommand = {
        verb: 'look',
        directObject: 'test container',
        originalText: 'look at test container'
      };
      
      const result = lookHandler.execute(command, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      
      const event = result.events[0];
      expect(event.type).toBe(StandardEventTypes.ITEM_EXAMINED);
      expect(event.payload.itemName).toBe('Test Container');
      expect(event.payload.isContainer).toBe(true);
      expect(event.payload.isOpen).toBe(true);
      expect(event.payload.contents).toHaveLength(1);
      expect(event.payload.contents[0].name).toBe('Contained Item');
    });
    
    it('should fail when looking at a non-existent object', () => {
      const command: ParsedCommand = {
        verb: 'look',
        directObject: 'non-existent item',
        originalText: 'look at non-existent item'
      };
      
      const result = lookHandler.execute(command, mockContext);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain("don't see any non-existent item");
    });
  });

  describe('validate', () => {
    it('should validate looking around', () => {
      const command: ParsedCommand = {
        verb: 'look',
        originalText: 'look'
      };
      
      const result = lookHandler.validate(command, mockContext);
      
      expect(result.valid).toBe(true);
    });
    
    it('should validate looking at an existing object', () => {
      const command: ParsedCommand = {
        verb: 'look',
        directObject: 'test item',
        originalText: 'look at test item'
      };
      
      const result = lookHandler.validate(command, mockContext);
      
      expect(result.valid).toBe(true);
    });
    
    it('should invalidate looking at a non-existent object', () => {
      const command: ParsedCommand = {
        verb: 'look',
        directObject: 'non-existent item',
        originalText: 'look at non-existent item'
      };
      
      // Mock the context to return null for findEntityByName
      const mockContextWithNoEntity = {
        ...mockContext,
        findEntityByName: () => null
      };
      
      const result = lookHandler.validate(command, mockContextWithNoEntity);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain("don't see any non-existent item");
    });
  });
});
