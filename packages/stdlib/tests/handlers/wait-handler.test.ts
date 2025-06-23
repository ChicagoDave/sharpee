// packages/stdlib/tests/handlers/wait-handler.test.ts

import { WaitHandler } from '../../src/handlers/wait-handler';
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
  locationEntity: Entity
): GameContext => {
  const allEntities = {
    [playerEntity.id]: playerEntity,
    [locationEntity.id]: locationEntity
  };

  return {
    player: playerEntity,
    currentLocation: locationEntity,
    getEntity: (id: string) => allEntities[id]
  } as GameContext;
};

describe('WaitHandler', () => {
  let waitHandler: WaitHandler;
  let playerEntity: Entity;
  let roomEntity: Entity;
  let mockContext: GameContext;

  beforeEach(() => {
    waitHandler = new WaitHandler();
    
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
      [RelationshipType.CONTAINS]: ['player_1']
    });
    
    // Set up the context
    mockContext = createMockGameContext(
      playerEntity,
      roomEntity
    );
  });

  describe('execute', () => {
    it('should create a wait event when player waits', () => {
      const command: ParsedCommand = {
        verb: 'wait',
        originalText: 'wait'
      };
      
      const result = waitHandler.execute(command, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      
      const event = result.events[0];
      expect(event.type).toBe(StandardEventTypes.PLAYER_WAITED);
      expect(event.payload.turns).toBe(1);
      expect(event.metadata.actor).toBe('player_1');
      expect(event.metadata.location).toBe('room_1');
      expect(event.metadata.tags).toContain(StandardEventTags.VISIBLE);
    });
  });

  describe('synonyms', () => {
    it('should handle "z" as a synonym for "wait"', () => {
      const command: ParsedCommand = {
        verb: 'z',
        originalText: 'z'
      };
      
      const result = waitHandler.execute(command, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.events[0].type).toBe(StandardEventTypes.PLAYER_WAITED);
    });
  });
});
