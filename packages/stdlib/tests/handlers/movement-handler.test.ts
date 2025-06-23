// packages/stdlib/tests/handlers/movement-handler.test.ts

import { MovementHandler } from '../../src/handlers/movement-handler';
import { Entity, EntityId, RelationshipType } from '@sharpee/core';
import { GameContext, CommandResult } from '@sharpee/core';
import { ParsedCommand } from '@sharpee/core';
import { StandardEventTypes, StandardEventTags } from '@sharpee/core';
import { MOVEMENT_SYSTEMS, MovementSystem } from '@sharpee/core';

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
    findEntityByName: (name: string) => {
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
      
      // Update the currentLocation reference for the mock context
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

describe('MovementHandler', () => {
  let movementHandler: MovementHandler;
  let playerEntity: Entity;
  let currentRoom: Entity;
  let northRoom: Entity;
  let northExit: Entity;
  let blockedExit: Entity;
  let mockContext: GameContext;
  let mockLookHandler: any;

  beforeEach(() => {
    movementHandler = new MovementHandler('compass');
    
    // Create mock entities
    playerEntity = createMockEntity('player_1', {
      name: 'Player',
      type: 'player'
    });
    
    currentRoom = createMockEntity('room_1', {
      name: 'Starting Room',
      description: 'This is the starting room.',
      type: 'location'
    }, {
      [RelationshipType.CONTAINS]: ['player_1'],
      [RelationshipType.EXIT]: ['exit_north', 'exit_east']
    });
    
    northRoom = createMockEntity('room_2', {
      name: 'North Room',
      description: 'This is the room to the north.',
      type: 'location'
    });
    
    northExit = createMockEntity('exit_north', {
      name: 'North Exit',
      direction: 'north',
      destination: 'room_2',
      accessible: true
    });
    
    blockedExit = createMockEntity('exit_east', {
      name: 'East Exit',
      direction: 'east',
      destination: 'room_3',
      accessible: false
    });
    
    // Mock look handler for automatic look after movement
    mockLookHandler = {
      execute: jest.fn(() => ({
        success: true,
        events: [{
          id: 'look_event_1',
          type: StandardEventTypes.ITEM_EXAMINED,
          payload: {
            description: 'This is the room to the north.'
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
      currentRoom,
      {
        'room_2': northRoom,
        'exit_north': northExit,
        'exit_east': blockedExit
      },
      {
        'look': mockLookHandler
      }
    );
  });

  describe('canHandle', () => {
    it('should handle direction commands', () => {
      const command: ParsedCommand = {
        verb: 'north',
        originalText: 'north'
      };
      
      expect(movementHandler.canHandle(command, mockContext)).toBe(true);
    });
    
    it('should handle movement verbs with direction', () => {
      const command: ParsedCommand = {
        verb: 'go',
        directObject: 'north',
        originalText: 'go north'
      };
      
      expect(movementHandler.canHandle(command, mockContext)).toBe(true);
    });
    
    it('should not handle non-movement commands', () => {
      const command: ParsedCommand = {
        verb: 'take',
        directObject: 'item',
        originalText: 'take item'
      };
      
      expect(movementHandler.canHandle(command, mockContext)).toBe(false);
    });
  });

  describe('execute', () => {
    it('should handle direct direction commands', () => {
      const command: ParsedCommand = {
        verb: 'north',
        originalText: 'north'
      };
      
      const result = movementHandler.execute(command, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(2); // Move event + look event
      
      const moveEvent = result.events[0];
      expect(moveEvent.type).toBe(StandardEventTypes.PLAYER_MOVED);
      expect(moveEvent.payload.direction).toBe('north');
      expect(moveEvent.payload.fromLocation).toBe('room_1');
      expect(moveEvent.payload.toLocation).toBe('room_2');
      
      // Check context was updated
      expect(result.context?.currentLocation.id).toBe('room_2');
    });
    
    it('should handle go commands with direction', () => {
      const command: ParsedCommand = {
        verb: 'go',
        directObject: 'north',
        originalText: 'go north'
      };
      
      const result = movementHandler.execute(command, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(2); // Move event + look event
      
      const moveEvent = result.events[0];
      expect(moveEvent.type).toBe(StandardEventTypes.PLAYER_MOVED);
      expect(moveEvent.payload.direction).toBe('north');
      
      // Check context was updated
      expect(result.context?.currentLocation.id).toBe('room_2');
    });
    
    it('should fail when moving in a direction with no exit', () => {
      const command: ParsedCommand = {
        verb: 'south',
        originalText: 'south'
      };
      
      const result = movementHandler.execute(command, mockContext);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain("You can't go south");
    });
    
    it('should fail when trying to go through a blocked exit', () => {
      const command: ParsedCommand = {
        verb: 'east',
        originalText: 'east'
      };
      
      const result = movementHandler.execute(command, mockContext);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain("The way is blocked");
    });
    
    it('should handle abbreviations for directions', () => {
      // Set the command to use 'n' instead of 'north'
      const command: ParsedCommand = {
        verb: 'n',
        originalText: 'n'
      };
      
      const result = movementHandler.execute(command, mockContext);
      
      expect(result.success).toBe(true);
      
      const moveEvent = result.events[0];
      expect(moveEvent.payload.direction).toBe('north');
    });
  });

  describe('movement systems', () => {
    it('should allow changing movement systems', () => {
      // Switch to nautical system
      movementHandler.setMovementSystem('nautical');
      
      // Create a nautical exit
      const nauticalExit = createMockEntity('exit_port', {
        name: 'Port Exit',
        direction: 'port', // 'port' in nautical = 'west' in compass
        destination: 'room_4',
        accessible: true
      });
      
      const portRoom = createMockEntity('room_4', {
        name: 'Port Room',
        description: 'This is the room to port.',
        type: 'location'
      });
      
      // Update the room to have a port exit
      const updatedRoom = {
        ...currentRoom,
        relationships: {
          ...currentRoom.relationships,
          [RelationshipType.EXIT]: [...(currentRoom.relationships[RelationshipType.EXIT] || []), 'exit_port']
        }
      };
      
      // Update context
      const nauticalContext = createMockGameContext(
        playerEntity,
        updatedRoom,
        {
          ...mockContext.getEntity('room_2') ? { 'room_2': northRoom } : {},
          ...mockContext.getEntity('exit_north') ? { 'exit_north': northExit } : {},
          ...mockContext.getEntity('exit_east') ? { 'exit_east': blockedExit } : {},
          'room_4': portRoom,
          'exit_port': nauticalExit
        },
        {
          'look': mockLookHandler
        }
      );
      
      // Try movement with nautical direction
      const command: ParsedCommand = {
        verb: 'port',
        originalText: 'port'
      };
      
      const result = movementHandler.execute(command, nauticalContext);
      
      expect(result.success).toBe(true);
      expect(result.events[0].payload.direction).toBe('port');
      expect(result.context?.currentLocation.id).toBe('room_4');
    });
  });
});
