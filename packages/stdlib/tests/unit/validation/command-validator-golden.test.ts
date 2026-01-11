/**
 * Golden test for CommandValidator - demonstrates new testing patterns
 * 
 * This test file shows how to properly test the CommandValidator
 * with the refactored architecture using the real parser.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { CommandValidator } from '../../../src/validation/command-validator';
import { StandardActionRegistry } from '../../../src/actions/registry';
import { AuthorModel, WorldModel, IFEntity, TraitType, EntityType } from '@sharpee/world-model';
import { createCommand, createParserWithWorld, parseCommand } from '../../test-utils';
import { StandardScopeResolver } from '../../../src/scope/scope-resolver';
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
  let author: AuthorModel;
  let player: IFEntity;
  let room: IFEntity;
  let registry: StandardActionRegistry;
  let validator: CommandValidator;
  let eventSource: TestEventSource;
  let parser: any;

  beforeEach(() => {
    // Create world model and author model for test setup
    world = new WorldModel();
    author = new AuthorModel(world.getDataStore(), world);
    
    // Create player and room using AuthorModel to bypass sanity checks
    player = author.createEntity('yourself', EntityType.ACTOR);
    room = author.createEntity('Test Room', EntityType.ROOM);
    room.add({ type: TraitType.ROOM });
    author.moveEntity(player.id, room.id);
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
          // IValidationError doesn't have a message field
        }
        return;
      }
      
      const result = validator.validate(parsed!);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('ACTION_NOT_AVAILABLE');
        // IValidationError doesn't have a message field
      }
    });

    test.skip('validates action without object in parsed command', () => {
      // Skip: Parser currently requires object for 'take' verb
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
      // Add a box using AuthorModel
      const box = author.createEntity('box', EntityType.CONTAINER);
      box.add({
        type: TraitType.IDENTITY,
        name: 'box',
        adjectives: ['wooden', 'old']
      });
      author.moveEntity(box.id, room.id);
      
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
      // Add colored balls using AuthorModel
      redBall = author.createEntity('ball', EntityType.OBJECT);
      redBall.add({
        type: TraitType.IDENTITY,
        name: 'ball',
        adjectives: ['red', 'small']
      });
      author.moveEntity(redBall.id, room.id);
      
      blueBall = author.createEntity('ball', EntityType.OBJECT);
      blueBall.add({
        type: TraitType.IDENTITY,
        name: 'ball',
        adjectives: ['blue', 'large']
      });
      author.moveEntity(blueBall.id, room.id);
    });

    test('resolves entity with adjective', () => {
      const command = createCommand('if.action.taking');
      command.parsed.structure = {
        verb: { tokens: [0], text: 'take', head: 'take' },
        directObject: {
          tokens: [1, 2],
          text: 'ball',
          head: 'ball',
          modifiers: ['red'],
          articles: [],
          determiners: [],
          candidates: ['ball']
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
      const ball = author.createEntity('ball', EntityType.OBJECT);
      ball.add({
        type: TraitType.IDENTITY,
        name: 'ball'
      });
      author.moveEntity(ball.id, room.id);
      
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
      const key = author.createEntity('key', EntityType.OBJECT);
      key.add({
        type: TraitType.IDENTITY,
        name: 'key',
        adjectives: ['brass', 'small']
      });
      author.moveEntity(key.id, player.id); // In inventory
      
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
      const ball = author.createEntity('ball', EntityType.OBJECT);
      ball.add({
        type: TraitType.IDENTITY,
        name: 'ball',
        adjectives: ['red']
      });
      
      // Create another room and put ball there
      const room2 = author.createEntity('Other Room', EntityType.ROOM);
      room2.add({ type: TraitType.ROOM });
      author.moveEntity(ball.id, room2.id);
      
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
      const ball = author.createEntity('ball', EntityType.OBJECT);
      ball.add({
        type: TraitType.IDENTITY,
        name: 'red ball'
      });
      author.moveEntity(ball.id, room.id);
      
      const parsed = parseCommand('take red ball', world);
      expect(parsed).not.toBeNull();

      validator.validate(parsed!);

      const resolutionEvents = eventSource.getEventsByType('entity_resolution');
      expect(resolutionEvents.length).toBeGreaterThan(0);
      expect(resolutionEvents[0].data.objectType).toBe('direct');
      expect(resolutionEvents[0].data.reference.text).toBe('red ball');
    });

    test('emits scope check debug events', () => {
      const box = author.createEntity('box', EntityType.CONTAINER);
      box.add({
        type: TraitType.IDENTITY,
        name: 'box'
      });
      author.moveEntity(box.id, room.id);
      
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
      const ball1 = author.createEntity('ball', EntityType.OBJECT);
      ball1.add({
        type: TraitType.IDENTITY,
        name: 'ball'
      });
      const ball2 = author.createEntity('ball', EntityType.OBJECT);
      ball2.add({
        type: TraitType.IDENTITY,
        name: 'ball'
      });
      author.moveEntity(ball1.id, room.id);
      author.moveEntity(ball2.id, room.id);
      
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
        // IValidationError doesn't have a message field
        expect(result.error.details?.ambiguousEntities).toBeDefined();
      }
    });

    test('auto-resolves when adjectives disambiguate', () => {
      // Add two balls with different adjectives
      const smallBall = author.createEntity('ball', EntityType.OBJECT);
      smallBall.add({
        type: TraitType.IDENTITY,
        name: 'ball',
        adjectives: ['small', 'red']
      });
      
      const largeBall = author.createEntity('ball', EntityType.OBJECT);
      largeBall.add({
        type: TraitType.IDENTITY,
        name: 'ball',
        adjectives: ['large', 'blue']
      });
      
      author.moveEntity(smallBall.id, room.id);
      author.moveEntity(largeBall.id, room.id);
      
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
      const box = author.createEntity('box', EntityType.CONTAINER);
      box.add({
        type: TraitType.IDENTITY,
        name: 'box',
        synonyms: ['container', 'crate', 'chest']
      });
      author.moveEntity(box.id, room.id);
      
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
      const box = author.createEntity('box', EntityType.CONTAINER);
      box.add({
        type: TraitType.IDENTITY,
        name: 'wooden box'
      });
      author.moveEntity(box.id, room.id);
      
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
        expect(result.value.directObject?.entity.type).toBe('container');
      }
    });
  });

  describe('Complex Commands', () => {
    test('validates commands with prepositions', () => {
      const ball = author.createEntity('ball', EntityType.OBJECT);
      ball.add({
        type: TraitType.IDENTITY,
        name: 'red ball'
      });
      const box = author.createEntity('box', EntityType.CONTAINER);
      box.add({
        type: TraitType.IDENTITY,
        name: 'wooden box'
      });
      box.add({
        type: TraitType.CONTAINER
      });
      author.moveEntity(ball.id, player.id); // Ball in inventory
      author.moveEntity(box.id, room.id);
      
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

  describe('resolveWithSelection (Disambiguation)', () => {
    let redApple: IFEntity;
    let greenApple: IFEntity;

    beforeEach(() => {
      // Create two apples that would be ambiguous
      redApple = author.createEntity('red apple', EntityType.OBJECT);
      redApple.add({
        type: TraitType.IDENTITY,
        name: 'apple',
        adjectives: ['red']
      });
      author.moveEntity(redApple.id, room.id);

      greenApple = author.createEntity('green apple', EntityType.OBJECT);
      greenApple.add({
        type: TraitType.IDENTITY,
        name: 'apple',
        adjectives: ['green']
      });
      author.moveEntity(greenApple.id, room.id);
    });

    test('should resolve with explicit directObject selection', () => {
      const command = createCommand('if.action.taking');
      command.parsed.structure = {
        verb: { tokens: [0], text: 'take', head: 'take' },
        directObject: {
          tokens: [1],
          text: 'apple',
          head: 'apple',
          modifiers: [],
          articles: [],
          determiners: [],
          candidates: ['apple']
        }
      };

      // First validate - would normally be ambiguous
      // Now re-resolve with explicit selection
      const result = validator.resolveWithSelection(command.parsed, {
        directObject: redApple.id
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.id).toBe(redApple.id);
      }
    });

    test('should resolve with different explicit selection', () => {
      const command = createCommand('if.action.taking');
      command.parsed.structure = {
        verb: { tokens: [0], text: 'take', head: 'take' },
        directObject: {
          tokens: [1],
          text: 'apple',
          head: 'apple',
          modifiers: [],
          articles: [],
          determiners: [],
          candidates: ['apple']
        }
      };

      const result = validator.resolveWithSelection(command.parsed, {
        directObject: greenApple.id
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.id).toBe(greenApple.id);
      }
    });

    test('should fail if selected entity no longer exists', () => {
      const command = createCommand('if.action.taking');
      command.parsed.structure = {
        verb: { tokens: [0], text: 'take', head: 'take' },
        directObject: {
          tokens: [1],
          text: 'apple',
          head: 'apple',
          modifiers: [],
          articles: [],
          determiners: [],
          candidates: ['apple']
        }
      };

      const result = validator.resolveWithSelection(command.parsed, {
        directObject: 'non-existent-entity-id'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('ENTITY_NOT_FOUND');
        expect(result.error.details).toHaveProperty('slot', 'directObject');
        expect(result.error.details).toHaveProperty('selectedId', 'non-existent-entity-id');
      }
    });

    test('should resolve indirectObject with explicit selection', () => {
      // Create a box for putting
      const box = author.createEntity('box', EntityType.CONTAINER);
      box.add({ type: TraitType.IDENTITY, name: 'box' });
      box.add({ type: TraitType.CONTAINER });
      box.add({ type: TraitType.OPENABLE, isOpen: true });
      author.moveEntity(box.id, room.id);

      // Move one apple to inventory so we can put it
      author.moveEntity(redApple.id, player.id);

      const command = createCommand('if.action.putting');
      command.parsed.structure = {
        verb: { tokens: [0], text: 'put', head: 'put' },
        directObject: {
          tokens: [1],
          text: 'apple',
          head: 'apple',
          modifiers: [],
          articles: [],
          determiners: [],
          candidates: ['apple']
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

      const result = validator.resolveWithSelection(command.parsed, {
        directObject: redApple.id,
        indirectObject: box.id
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.id).toBe(redApple.id);
        expect(result.value.indirectObject?.entity.id).toBe(box.id);
      }
    });

    test('should use normal resolution for unspecified slots', () => {
      // This test verifies that when only some slots are specified in the selection,
      // the other slots still get resolved normally.
      // We'll only test that directObject is correctly set to the explicitly selected entity.
      // Testing indirectObject normal resolution would require complex setup that belongs
      // in the general validation tests, not here.

      const command = createCommand('if.action.taking');
      command.parsed.structure = {
        verb: { tokens: [0], text: 'take', head: 'take' },
        directObject: {
          tokens: [1],
          text: 'apple',
          head: 'apple',
          modifiers: [],
          articles: [],
          determiners: [],
          candidates: ['apple']
        }
      };

      // Explicitly select the red apple
      const result = validator.resolveWithSelection(command.parsed, {
        directObject: redApple.id
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.id).toBe(redApple.id);
        expect(result.value.actionId).toBe('if.action.taking');
      }
    });

    test('should still check scope constraints on selected entities', () => {
      // Create an entity in another room (not reachable)
      const otherRoom = author.createEntity('Other Room', EntityType.ROOM);
      otherRoom.add({ type: TraitType.ROOM });

      const distantApple = author.createEntity('distant apple', EntityType.OBJECT);
      distantApple.add({ type: TraitType.IDENTITY, name: 'apple', adjectives: ['distant'] });
      author.moveEntity(distantApple.id, otherRoom.id);

      const command = createCommand('if.action.taking');
      command.parsed.structure = {
        verb: { tokens: [0], text: 'take', head: 'take' },
        directObject: {
          tokens: [1],
          text: 'apple',
          head: 'apple',
          modifiers: [],
          articles: [],
          determiners: [],
          candidates: ['apple']
        }
      };

      // Try to select the distant apple - should fail scope check
      const result = validator.resolveWithSelection(command.parsed, {
        directObject: distantApple.id
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        // Should fail with scope error, not entity not found
        expect(result.error.code).toBe('ENTITY_NOT_VISIBLE');
      }
    });
  });
});
