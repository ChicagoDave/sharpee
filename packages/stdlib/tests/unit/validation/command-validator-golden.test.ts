/**
 * Golden test for CommandValidator - demonstrates new testing patterns
 * 
 * This test file shows how to properly test the CommandValidator
 * with the refactored architecture using the real parser.
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { CommandValidator } from '../../../src/validation/command-validator';
import { StandardActionRegistry } from '../../../src/actions/registry';
import { WorldModel, IFEntity, TraitType } from '@sharpee/world-model';
import { createCommand, createParserWithWorld, parseCommand } from '../../test-utils';
import type { 
  SystemEvent,
  GenericEventSource
} from '@sharpee/core';

// Import standard actions
import { takingAction } from '../../../src/actions/standard/taking';
import { examiningAction } from '../../../src/actions/standard/examining';
import { puttingAction } from '../../../src/actions/standard/putting';

// Mock event source for testing debug events
class TestEventSource implements GenericEventSource<SystemEvent> {
  events: SystemEvent[] = [];

  emit(event: SystemEvent): void {
    this.events.push(event);
  }

  subscribe(handler: (event: SystemEvent) => void): () => void {
    return () => {};
  }

  clear(): void {
    this.events = [];
  }

  getEventsByType(type: string): SystemEvent[] {
    return this.events.filter(e => e.type === type);
  }
}

describe('CommandValidator (Golden Pattern)', () => {
  let world: WorldModel;
  let player: IFEntity;
  let room: IFEntity;
  let registry: StandardActionRegistry;
  let validator: CommandValidator;
  let eventSource: TestEventSource;
  let parser: any;

  beforeEach(() => {
    // Create real world
    world = new WorldModel();
    
    // Create player and room
    player = world.createEntity('yourself', 'actor');
    room = world.createEntity('Test Room', 'location');
    world.moveEntity(player.id, room.id);
    world.setPlayer(player.id);
    
    // Create parser with world
    parser = createParserWithWorld(world);
    
    registry = new StandardActionRegistry();
    
    // Create a mock language provider for testing
    const mockLanguageProvider = {
      languageCode: 'en-US',
      getMessage: (id: string) => id,
      hasMessage: (id: string) => true,
      getActionPatterns: (actionId: string) => {
        const patterns: Record<string, string[]> = {
          'if.action.taking': ['take', 'get', 'grab', 'pick up'],
          'if.action.examining': ['examine', 'x', 'look at'],
          'if.action.putting': ['put', 'place', 'insert']
        };
        return patterns[actionId];
      },
      getActionHelp: () => undefined,
      getSupportedActions: () => ['if.action.taking', 'if.action.examining', 'if.action.putting']
    };
    
    registry.setLanguageProvider(mockLanguageProvider as any);
    
    // Register real actions
    registry.register(takingAction);
    registry.register(examiningAction);
    registry.register(puttingAction);
    
    validator = new CommandValidator(world, registry);
    eventSource = new TestEventSource();
    validator.setSystemEventSource(eventSource);
  });

  describe('Basic Validation', () => {
    test('validates unknown action', () => {
      const parsed = parseCommand('frobnicate ball', world);
      if (!parsed) {
        // If parser fails, create a manual parsed command for testing
        const manualParsed = {
          rawInput: 'frobnicate ball',
          action: 'frobnicate',
          tokens: [],
          structure: {
            verb: { tokens: [0], text: 'frobnicate', head: 'frobnicate' },
            directObject: { 
              tokens: [1], 
              text: 'ball',
              head: 'ball',
              modifiers: [],
              articles: [],
              determiners: [],
              candidates: ['ball']
            }
          },
          pattern: 'VERB_NOUN',
          confidence: 1.0
        };
        const result = validator.validate(manualParsed as any);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('ACTION_NOT_AVAILABLE');
          expect(result.error.message).toContain('frobnicate');
        }
        return;
      }
      
      const result = validator.validate(parsed!);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('ACTION_NOT_AVAILABLE');
        expect(result.error.message).toContain('frobnicate');
      }
    });

    test('validates action without object in parsed command', () => {
      const parsed = parseCommand('take', world);
      expect(parsed).not.toBeNull();

      const result = validator.validate(parsed!);
      
      // Should succeed - the action will handle the missing object
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.actionId).toBe('if.action.taking');
        expect(result.value.directObject).toBeUndefined();
      }
    });

    test('validates simple entity resolution', () => {
      // Add a box to the world
      const box = world.createEntity('wooden box', 'container');
      box.add({
        type: TraitType.IDENTITY,
        name: 'wooden box',
        adjectives: ['wooden', 'old']
      });
      world.moveEntity(box.id, room.id);
      
      // Create a command with action ID already resolved
      const command = createCommand('if.action.taking');
      command.parsed.structure = {
        verb: { tokens: [0], text: 'take', head: 'take' },
        directObject: {
          tokens: [1],
          text: 'box',
          head: 'box',
          modifiers: [],
          articles: [],
          determiners: [],
          candidates: ['box']
        }
      };

      const result = validator.validate(command.parsed);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.actionId).toBe('if.action.taking');
        expect(result.value.directObject?.entity.id).toBe(box.id);
      }
    });
  });

  describe('Adjective Matching', () => {
    let redBall: IFEntity;
    let blueBall: IFEntity;

    beforeEach(() => {
      // Add colored balls
      redBall = world.createEntity('red ball', 'ball');
      redBall.add({
        type: TraitType.IDENTITY,
        name: 'red ball',
        adjectives: ['red', 'small']
      });
      world.moveEntity(redBall.id, room.id);
      
      blueBall = world.createEntity('blue ball', 'ball');
      blueBall.add({
        type: TraitType.IDENTITY,
        name: 'blue ball',
        adjectives: ['blue', 'large']
      });
      world.moveEntity(blueBall.id, room.id);
    });

    test('resolves entity with adjective', () => {
      const command = createCommand('if.action.taking');
      command.parsed.structure = {
        verb: { tokens: [0], text: 'take', head: 'take' },
        directObject: {
          tokens: [1, 2],
          text: 'red ball',
          head: 'ball',
          modifiers: ['red'],
          articles: [],
          determiners: [],
          candidates: ['red', 'ball']
        }
      };

      const result = validator.validate(command.parsed);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.id).toBe(redBall.id);
      }
    });

    test('distinguishes between similar objects by adjective', () => {
      const command = createCommand('if.action.taking');
      command.parsed.structure = {
        verb: { tokens: [0], text: 'take', head: 'take' },
        directObject: {
          tokens: [1, 2],
          text: 'blue ball',
          head: 'ball',
          modifiers: ['blue'],
          articles: [],
          determiners: [],
          candidates: ['blue', 'ball']
        }
      };

      const result = validator.validate(command.parsed);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.id).toBe(blueBall.id);
      }
    });

    test('handles wrong adjective', () => {
      const parsed = parseCommand('take green ball', world);
      expect(parsed).not.toBeNull();

      const result = validator.validate(parsed!);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('ENTITY_NOT_FOUND');
      }
    });
  });

  describe('Scope Rules', () => {
    test('allows taking visible objects', () => {
      const ball = world.createEntity('ball', 'ball');
      ball.add({
        type: TraitType.IDENTITY,
        name: 'ball'
      });
      world.moveEntity(ball.id, room.id);
      
      const command = createCommand('if.action.taking');
      command.parsed.structure = {
        verb: { tokens: [0], text: 'take', head: 'take' },
        directObject: {
          tokens: [1],
          text: 'ball',
          head: 'ball',
          modifiers: [],
          articles: [],
          determiners: [],
          candidates: ['ball']
        }
      };

      const result = validator.validate(command.parsed);
      expect(result.success).toBe(true);
    });

    test('allows examining inventory items', () => {
      const key = world.createEntity('brass key', 'key');
      key.add({
        type: TraitType.IDENTITY,
        name: 'brass key',
        adjectives: ['brass', 'small']
      });
      world.moveEntity(key.id, player.id); // In inventory
      
      const command = createCommand('if.action.examining');
      command.parsed.structure = {
        verb: { tokens: [0], text: 'examine', head: 'examine' },
        directObject: {
          tokens: [1],
          text: 'key',
          head: 'key',
          modifiers: [],
          articles: [],
          determiners: [],
          candidates: ['key']
        }
      };

      const result = validator.validate(command.parsed);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.id).toBe(key.id);
      }
    });

    test('prevents taking objects from other rooms', () => {
      const ball = world.createEntity('red ball', 'ball');
      ball.add({
        type: TraitType.IDENTITY,
        name: 'red ball',
        adjectives: ['red']
      });
      
      // Create another room and put ball there
      const room2 = world.createEntity('Other Room', 'location');
      world.moveEntity(ball.id, room2.id);
      
      const parsed = parseCommand('take red ball', world);
      expect(parsed).not.toBeNull();

      const result = validator.validate(parsed!);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('ENTITY_NOT_FOUND');
      }
    });
  });

  describe('Debug Events', () => {
    test('emits entity resolution debug events', () => {
      const ball = world.createEntity('red ball', 'ball');
      ball.add({
        type: TraitType.IDENTITY,
        name: 'red ball'
      });
      world.moveEntity(ball.id, room.id);
      
      const parsed = parseCommand('take red ball', world);
      expect(parsed).not.toBeNull();

      validator.validate(parsed!);

      const resolutionEvents = eventSource.getEventsByType('entity_resolution');
      expect(resolutionEvents.length).toBeGreaterThan(0);
      expect(resolutionEvents[0].data.objectType).toBe('direct');
      expect(resolutionEvents[0].data.reference.text).toBe('red ball');
    });

    test('emits scope check debug events', () => {
      const box = world.createEntity('box', 'container');
      box.add({
        type: TraitType.IDENTITY,
        name: 'box'
      });
      world.moveEntity(box.id, room.id);
      
      const command = createCommand('if.action.taking');
      command.parsed.structure = {
        verb: { tokens: [0], text: 'take', head: 'take' },
        directObject: {
          tokens: [1],
          text: 'box',
          head: 'box',
          modifiers: [],
          articles: [],
          determiners: [],
          candidates: ['box']
        }
      };

      validator.validate(command.parsed);

      const scopeEvents = eventSource.getEventsByType('scope_check');
      expect(scopeEvents.length).toBeGreaterThan(0);
      expect(scopeEvents[0].data.requiredScope).toBeDefined();
      expect(scopeEvents[0].data.entitiesInScope).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Ambiguity Resolution', () => {
    test('returns ambiguity error when multiple matches', () => {
      // Add two balls
      const ball1 = world.createEntity('ball', 'ball');
      ball1.add({
        type: TraitType.IDENTITY,
        name: 'ball'
      });
      const ball2 = world.createEntity('ball', 'ball');
      ball2.add({
        type: TraitType.IDENTITY,
        name: 'ball'
      });
      world.moveEntity(ball1.id, room.id);
      world.moveEntity(ball2.id, room.id);
      
      const command = createCommand('if.action.taking');
      command.parsed.structure = {
        verb: { tokens: [0], text: 'take', head: 'take' },
        directObject: {
          tokens: [1],
          text: 'ball',
          head: 'ball',
          modifiers: [],
          articles: [],
          determiners: [],
          candidates: ['ball']
        }
      };

      const result = validator.validate(command.parsed);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Which');
        expect(result.error.details?.ambiguousEntities).toBeDefined();
      }
    });

    test('auto-resolves when adjectives disambiguate', () => {
      // Add two balls with different adjectives
      const smallBall = world.createEntity('small ball', 'ball');
      smallBall.add({
        type: TraitType.IDENTITY,
        name: 'small ball',
        adjectives: ['small', 'red']
      });
      
      const largeBall = world.createEntity('large ball', 'ball');
      largeBall.add({
        type: TraitType.IDENTITY,
        name: 'large ball',
        adjectives: ['large', 'blue']
      });
      
      world.moveEntity(smallBall.id, room.id);
      world.moveEntity(largeBall.id, room.id);
      
      const command = createCommand('if.action.taking');
      command.parsed.structure = {
        verb: { tokens: [0], text: 'take', head: 'take' },
        directObject: {
          tokens: [1, 2],
          text: 'small ball',
          head: 'ball',
          modifiers: ['small'],
          articles: [],
          determiners: [],
          candidates: ['small', 'ball']
        }
      };

      const result = validator.validate(command.parsed);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.id).toBe(smallBall.id);
      }
    });
  });

  describe('Synonym Resolution', () => {
    test('resolves entity by synonym', () => {
      const box = world.createEntity('wooden box', 'box');
      box.add({
        type: TraitType.IDENTITY,
        name: 'wooden box',
        synonyms: ['container', 'crate', 'chest']
      });
      world.moveEntity(box.id, room.id);
      
      const command = createCommand('if.action.taking');
      command.parsed.structure = {
        verb: { tokens: [0], text: 'take', head: 'take' },
        directObject: {
          tokens: [1],
          text: 'container',
          head: 'container',
          modifiers: [],
          articles: [],
          determiners: [],
          candidates: ['container']
        }
      };

      const result = validator.validate(command.parsed);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.id).toBe(box.id);
      }
    });

    test('resolves entity by type name', () => {
      const box = world.createEntity('wooden box', 'box');
      box.add({
        type: TraitType.IDENTITY,
        name: 'wooden box'
      });
      world.moveEntity(box.id, room.id);
      
      const command = createCommand('if.action.taking');
      command.parsed.structure = {
        verb: { tokens: [0], text: 'take', head: 'take' },
        directObject: {
          tokens: [1],
          text: 'box',
          head: 'box',
          modifiers: [],
          articles: [],
          determiners: [],
          candidates: ['box']
        }
      };

      const result = validator.validate(command.parsed);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.type).toBe('box');
      }
    });
  });

  describe('Complex Commands', () => {
    test('validates commands with prepositions', () => {
      const ball = world.createEntity('red ball', 'ball');
      ball.add({
        type: TraitType.IDENTITY,
        name: 'red ball'
      });
      const box = world.createEntity('wooden box', 'container');
      box.add({
        type: TraitType.IDENTITY,
        name: 'wooden box'
      });
      box.add({
        type: TraitType.CONTAINER
      });
      world.moveEntity(ball.id, player.id); // Ball in inventory
      world.moveEntity(box.id, room.id);
      
      const command = createCommand('if.action.putting');
      command.parsed.structure = {
        verb: { tokens: [0], text: 'put', head: 'put' },
        directObject: {
          tokens: [1],
          text: 'ball',
          head: 'ball',
          modifiers: [],
          articles: [],
          determiners: [],
          candidates: ['ball']
        },
        preposition: { tokens: [2], text: 'in' },
        indirectObject: {
          tokens: [3],
          text: 'box',
          head: 'box',
          modifiers: [],
          articles: [],
          determiners: [],
          candidates: ['box']
        }
      };

      const result = validator.validate(command.parsed);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.id).toBe(ball.id);
        expect(result.value.indirectObject?.entity.id).toBe(box.id);
      }
    });
  });
});
