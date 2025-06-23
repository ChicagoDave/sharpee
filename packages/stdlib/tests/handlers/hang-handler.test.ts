// packages/stdlib/tests/handlers/hang-handler.test.ts

import { HangHandler } from '../../src/handlers/hang-handler';
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

describe('HangHandler', () => {
  let hangHandler: HangHandler;
  let playerEntity: Entity;
  let cloakroomEntity: Entity;
  let otherRoomEntity: Entity;
  let cloakEntity: Entity;
  let hookEntity: Entity;
  let barRoomEntity: Entity;
  let messageEntity: Entity;
  let mockCloakroomContext: GameContext;
  let mockOtherRoomContext: GameContext;

  beforeEach(() => {
    hangHandler = new HangHandler();
    
    // Create mock entities
    playerEntity = createMockEntity('player_1', {
      name: 'Player',
      type: 'player'
    }, {
      [RelationshipType.CONTAINS]: ['cloak_1'] // Player has the cloak
    });
    
    cloakEntity = createMockEntity('cloak_1', {
      name: 'Cloak',
      description: 'A handsome velvet cloak, of peculiar black.',
      type: 'item',
      takeable: true,
      hung: false
    });
    
    hookEntity = createMockEntity('hook_1', {
      name: 'Hook',
      description: 'A small brass hook on the wall.',
      type: 'fixture'
    });
    
    cloakroomEntity = createMockEntity('room_cloakroom', {
      name: 'Cloakroom',
      description: 'A small cloakroom with a hook on the wall.',
      type: 'location'
    }, {
      [RelationshipType.CONTAINS]: ['player_1', 'hook_1']
    });
    
    otherRoomEntity = createMockEntity('room_other', {
      name: 'Other Room',
      description: 'Another room with no hook.',
      type: 'location'
    });
    
    messageEntity = createMockEntity('message_1', {
      name: 'Message',
      description: 'The message says: "You have won!"',
      type: 'item',
      visible: false
    });
    
    barRoomEntity = createMockEntity('room_bar', {
      name: 'Bar',
      description: 'The bar is dark. You can't see a thing.',
      type: 'room',
      dark: true
    }, {
      [RelationshipType.CONTAINS]: ['message_1']
    });
    
    // Set up contexts
    mockCloakroomContext = createMockGameContext(
      playerEntity,
      cloakroomEntity,
      {
        'cloak_1': cloakEntity,
        'hook_1': hookEntity,
        'room_bar': barRoomEntity,
        'message_1': messageEntity
      }
    );
    
    mockOtherRoomContext = createMockGameContext(
      playerEntity,
      otherRoomEntity,
      {
        'cloak_1': cloakEntity,
        'hook_1': hookEntity,
        'room_bar': barRoomEntity,
        'message_1': messageEntity
      }
    );
  });

  describe('canHandle', () => {
    it('should handle "hang cloak" command', () => {
      const command: ParsedCommand = {
        verb: 'hang',
        directObject: 'cloak',
        originalText: 'hang cloak',
        prepositions: {}
      };
      
      expect(hangHandler.canHandle(command, mockCloakroomContext)).toBe(true);
    });
    
    it('should handle "put cloak on hook" command', () => {
      const command: ParsedCommand = {
        verb: 'put',
        directObject: 'cloak',
        originalText: 'put cloak on hook',
        prepositions: { 'on': 'hook' }
      };
      
      expect(hangHandler.canHandle(command, mockCloakroomContext)).toBe(true);
    });
    
    it('should not handle non-cloak commands', () => {
      const command: ParsedCommand = {
        verb: 'hang',
        directObject: 'hat',
        originalText: 'hang hat',
        prepositions: {}
      };
      
      expect(hangHandler.canHandle(command, mockCloakroomContext)).toBe(false);
    });
  });

  describe('execute', () => {
    it('should hang the cloak on the hook in the cloakroom', () => {
      const command: ParsedCommand = {
        verb: 'hang',
        directObject: 'cloak',
        originalText: 'hang cloak',
        prepositions: {}
      };
      
      const result = hangHandler.execute(command, mockCloakroomContext);
      
      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      
      const event = result.events[0];
      expect(event.type).toBe(StandardEventTypes.ITEM_USED);
      expect(event.payload.itemName).toBe('Cloak');
      expect(event.payload.targetName).toBe('Hook');
      expect(event.payload.action).toBe('hang');
      
      // Check that the cloak was moved from inventory to hook
      if (result.context) {
        const updatedPlayer = result.context.player;
        const playerContains = updatedPlayer.relationships[RelationshipType.CONTAINS] || [];
        expect(playerContains).not.toContain('cloak_1');
        
        const updatedHook = result.context.getEntity('hook_1');
        const hookSupports = updatedHook?.relationships[RelationshipType.SUPPORTS] || [];
        expect(hookSupports).toContain('cloak_1');
        
        const updatedCloak = result.context.getEntity('cloak_1');
        expect(updatedCloak?.attributes.hung).toBe(true);
        
        // Check that the bar room was updated to be lit
        const updatedBar = result.context.getEntity('room_bar');
        expect(updatedBar?.attributes.dark).toBe(false);
        expect(updatedBar?.attributes.description).toContain('brightly lit');
        
        // Check that the message is now visible
        const updatedMessage = result.context.getEntity('message_1');
        expect(updatedMessage?.attributes.visible).toBe(true);
      } else {
        fail('Result context should be defined');
      }
    });
    
    it('should fail to hang the cloak outside the cloakroom', () => {
      const command: ParsedCommand = {
        verb: 'hang',
        directObject: 'cloak',
        originalText: 'hang cloak',
        prepositions: {}
      };
      
      const result = hangHandler.execute(command, mockOtherRoomContext);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('nowhere to hang your cloak');
    });
    
    it('should fail if player does not have the cloak', () => {
      // Create a player without the cloak
      const playerWithoutCloak = createMockEntity('player_1', {
        name: 'Player',
        type: 'player'
      }, {
        [RelationshipType.CONTAINS]: [] // Empty inventory
      });
      
      // Update context
      const contextWithoutCloak = createMockGameContext(
        playerWithoutCloak,
        cloakroomEntity,
        {
          'cloak_1': cloakEntity,
          'hook_1': hookEntity,
          'room_bar': barRoomEntity,
          'message_1': messageEntity
        }
      );
      
      const command: ParsedCommand = {
        verb: 'hang',
        directObject: 'cloak',
        originalText: 'hang cloak',
        prepositions: {}
      };
      
      const result = hangHandler.execute(command, contextWithoutCloak);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('not carrying a cloak');
    });
    
    it('should fail if there is no hook', () => {
      // Create a cloakroom without a hook
      const cloakroomWithoutHook = createMockEntity('room_cloakroom', {
        name: 'Cloakroom',
        description: 'A small cloakroom with no hook.',
        type: 'location'
      }, {
        [RelationshipType.CONTAINS]: ['player_1']
      });
      
      // Update context
      const contextWithoutHook = createMockGameContext(
        playerEntity,
        cloakroomWithoutHook,
        {
          'cloak_1': cloakEntity,
          'room_bar': barRoomEntity,
          'message_1': messageEntity
        }
      );
      
      const command: ParsedCommand = {
        verb: 'hang',
        directObject: 'cloak',
        originalText: 'hang cloak',
        prepositions: {}
      };
      
      const result = hangHandler.execute(command, contextWithoutHook);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('nothing to hang your cloak on');
    });
  });

  describe('synonyms', () => {
    it('should handle "hook cloak" as a synonym for "hang cloak"', () => {
      const command: ParsedCommand = {
        verb: 'hook',
        directObject: 'cloak',
        originalText: 'hook cloak',
        prepositions: {}
      };
      
      const result = hangHandler.execute(command, mockCloakroomContext);
      
      expect(result.success).toBe(true);
      expect(result.events[0].type).toBe(StandardEventTypes.ITEM_USED);
    });
    
    it('should handle "place cloak" as a synonym for "hang cloak"', () => {
      const command: ParsedCommand = {
        verb: 'place',
        directObject: 'cloak',
        originalText: 'place cloak',
        prepositions: {}
      };
      
      const result = hangHandler.execute(command, mockCloakroomContext);
      
      expect(result.success).toBe(true);
      expect(result.events[0].type).toBe(StandardEventTypes.ITEM_USED);
    });
  });
});
