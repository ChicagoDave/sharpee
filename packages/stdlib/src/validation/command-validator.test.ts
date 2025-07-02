/**
 * Test suite for the enhanced CommandValidator
 * 
 * Tests all the complex entity resolution scenarios:
 * - Adjective matching
 * - Scope rules
 * - Pronoun resolution
 * - Ambiguity handling
 * - Debug events
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { CommandValidatorImpl } from './command-validator';
import type { 
  SystemEvent,
  GenericEventSource
} from '@sharpee/core';

import type { 
ParsedCommand
} from '@sharpee/world-model';
import type { WorldModel, IFEntity } from '@sharpee/world-model';
import { StandardActionRegistry } from '../actions/registry';

// Mock implementations
class MockWorldModel implements WorldModel {
  private entities: Map<string, IFEntity> = new Map();
  private locations: Map<string, string> = new Map();
  private containers: Map<string, string[]> = new Map();
  private player: IFEntity;

  constructor() {
    // Create test entities using proper WorldModel interface
    this.player = this.createEntity('player', 'You');
    this.player.type = 'player';
    this.setEntityLocation('player', 'room1');
    
    // Room
    const room = this.createEntity('room1', 'Test Room');
    room.type = 'room';
    
    // Objects in room
    const redBall = this.createEntity('ball1', 'red ball');
    redBall.type = 'ball';
    const redBallIdentity = { 
      type: 'identity',
      name: 'red ball',
      adjectives: ['red', 'small'],
      description: 'A small red rubber ball'
    };
    redBall.add(redBallIdentity);
    this.setEntityLocation('ball1', 'room1');
    
    const blueBall = this.createEntity('ball2', 'blue ball');
    blueBall.type = 'ball';
    const blueBallIdentity = {
      type: 'identity',
      name: 'blue ball', 
      adjectives: ['blue', 'large'],
      description: 'A large blue beach ball'
    };
    blueBall.add(blueBallIdentity);
    this.setEntityLocation('ball2', 'room1');
    
    // Box in room
    const box = this.createEntity('box1', 'wooden box');
    box.type = 'box';
    const boxIdentity = {
      type: 'identity',
      name: 'wooden box',
      adjectives: ['wooden', 'old'],
      synonyms: ['container', 'crate']
    };
    box.add(boxIdentity);
    this.setEntityLocation('box1', 'room1');
    
    // Key in inventory
    const key = this.createEntity('key1', 'brass key');
    key.type = 'key';
    const keyIdentity = {
      type: 'identity',
      name: 'brass key',
      adjectives: ['brass', 'small']
    };
    key.add(keyIdentity);
    this.addToContainer('player', 'key1');
  }

  createEntity(id: string, displayName: string): IFEntity {
    // Import IFEntity class
    const { IFEntity } = require('@sharpee/world-model');
    const entity = new IFEntity(id, 'unknown');
    const identityTrait = {
      type: 'identity',
      name: displayName
    };
    entity.add(identityTrait);
    this.entities.set(id, entity);
    return entity;
  }

  setEntityLocation(entityId: string, locationId: string): void {
    this.locations.set(entityId, locationId);
    
    // Add to container contents
    const contents = this.containers.get(locationId) || [];
    if (!contents.includes(entityId)) {
      contents.push(entityId);
      this.containers.set(locationId, contents);
    }
  }

  addToContainer(containerId: string, entityId: string): void {
    const contents = this.containers.get(containerId) || [];
    contents.push(entityId);
    this.containers.set(containerId, contents);
    this.locations.set(entityId, containerId);
  }

  getPlayer(): IFEntity {
    return this.player;
  }

  getEntity(id: string): IFEntity | undefined {
    return this.entities.get(id);
  }

  getAllEntities(): IFEntity[] {
    return Array.from(this.entities.values());
  }

  getLocation(entityId: string): string | undefined {
    return this.locations.get(entityId);
  }

  getContents(containerId: string): IFEntity[] {
    const contentIds = this.containers.get(containerId) || [];
    return contentIds.map(id => this.entities.get(id)!).filter(Boolean);
  }

  findEntities(criteria: any): IFEntity[] {
    return Array.from(this.entities.values()).filter(e => {
      if (criteria.type && e.type !== criteria.type) return false;
      if (criteria.name && e.name !== criteria.name) return false;
      return true;
    });
  }

  // Add missing WorldModel interface methods
  hasEntity(id: string): boolean {
    return this.entities.has(id);
  }

  removeEntity(id: string): boolean {
    return this.entities.delete(id);
  }

  updateEntity(entityId: string, updater: (entity: IFEntity) => void): void {
    const entity = this.entities.get(entityId);
    if (entity) {
      updater(entity);
    }
  }

  moveEntity(entityId: string, targetId: string | null): boolean {
    if (targetId) {
      this.setEntityLocation(entityId, targetId);
    }
    return true;
  }

  canMoveEntity(entityId: string, targetId: string | null): boolean {
    return true;
  }

  getContainingRoom(entityId: string): IFEntity | undefined {
    const location = this.getLocation(entityId);
    if (location && this.getEntity(location)?.type === 'room') {
      return this.getEntity(location);
    }
    return undefined;
  }

  getAllContents(entityId: string, options?: any): IFEntity[] {
    return this.getContents(entityId);
  }

  getState(): any {
    return {};
  }

  setState(state: any): void {}

  getStateValue(key: string): any {
    return undefined;
  }

  setStateValue(key: string, value: any): void {}

  findByTrait(traitType: string, options?: any): IFEntity[] {
    return [];
  }

  findByType(entityType: string, options?: any): IFEntity[] {
    return Array.from(this.entities.values()).filter(e => e.type === entityType);
  }

  findWhere(predicate: (entity: IFEntity) => boolean, options?: any): IFEntity[] {
    return Array.from(this.entities.values()).filter(predicate);
  }

  getVisible(observerId: string): IFEntity[] {
    return this.getAllEntities();
  }

  getInScope(observerId: string): IFEntity[] {
    return this.getAllEntities();
  }

  canSee(observerId: string, targetId: string): boolean {
    return true;
  }

  getRelated(entityId: string, relationshipType: string): string[] {
    return [];
  }

  areRelated(entity1Id: string, entity2Id: string, relationshipType: string): boolean {
    return false;
  }

  addRelationship(entity1Id: string, entity2Id: string, relationshipType: string): void {}

  removeRelationship(entity1Id: string, entity2Id: string, relationshipType: string): void {}

  getTotalWeight(entityId: string): number {
    return 0;
  }

  wouldCreateLoop(entityId: string, targetId: string): boolean {
    return false;
  }

  findPath(fromRoomId: string, toRoomId: string): string[] | null {
    return null;
  }

  setPlayer(entityId: string): void {
    const entity = this.getEntity(entityId);
    if (entity) {
      this.player = entity;
    }
  }

  toJSON(): string {
    return '{}';
  }

  loadJSON(json: string): void {}

  clear(): void {
    this.entities.clear();
    this.locations.clear();
    this.containers.clear();
  }

  registerEventHandler(eventType: string, handler: any): void {}
  unregisterEventHandler(eventType: string): void {}
  registerEventValidator(eventType: string, validator: any): void {}
  registerEventPreviewer(eventType: string, previewer: any): void {}
  applyEvent(event: any): void {}
  canApplyEvent(event: any): boolean { return true; }
  previewEvent(event: any): any[] { return []; }
  getAppliedEvents(): any[] { return []; }
  getEventsSince(timestamp: number): any[] { return []; }
  clearEventHistory(): void {}
}

class MockActionRegistry extends StandardActionRegistry {
  private mockActions: Map<string, any> = new Map();

  constructor() {
    super();
    
    // Register test actions
    this.mockActions.set('TAKE', {
      id: 'TAKE',
      execute: vi.fn(),
      metadata: {
        requiresDirectObject: true,
        requiresIndirectObject: false,
        directObjectScope: 'reachable'
      }
    });

    this.mockActions.set('PUT', {
      id: 'PUT',
      execute: vi.fn(),
      metadata: {
        requiresDirectObject: true,
        requiresIndirectObject: true,
        directObjectScope: 'touchable',
        indirectObjectScope: 'reachable',
        validPrepositions: ['in', 'on', 'under']
      }
    });

    this.mockActions.set('LOOK', {
      id: 'LOOK',
      execute: vi.fn(),
      metadata: {
        requiresDirectObject: false,
        requiresIndirectObject: false
      }
    });
  }

  get(id: string): any {
    return this.mockActions.get(id);
  }

  getAvailableActions(): string[] {
    return Array.from(this.mockActions.keys());
  }
}

class MockEventSource implements GenericEventSource<SystemEvent> {
  events: SystemEvent[] = [];

  emit(event: SystemEvent): void {
    this.events.push(event);
  }

  subscribe(handler: (event: SystemEvent) => void): () => void {
    // Simple mock implementation
    return () => {};
  }

  clear(): void {
    this.events = [];
  }
}

describe('CommandValidator', () => {
  let world: MockWorldModel;
  let actionRegistry: MockActionRegistry;
  let validator: CommandValidatorImpl;
  let eventSource: MockEventSource;

  beforeEach(() => {
    world = new MockWorldModel();
    actionRegistry = new MockActionRegistry();
    validator = new CommandValidatorImpl(world, actionRegistry);
    eventSource = new MockEventSource();
    validator.setSystemEventSource(eventSource);
  });

  describe('Basic Validation', () => {
    test('validates unknown action', () => {
      const command: ParsedCommand = {
        rawInput: 'frobnicate the ball',
        action: 'FROBNICATE',
        directObject: {
          text: 'ball',
          candidates: ['ball']
        }
      };

      const result = validator.validate(command);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('ACTION_NOT_AVAILABLE');
        expect(result.error.message).toContain('frobnicate');
      }
    });

    test('validates action without required object', () => {
      const command: ParsedCommand = {
        rawInput: 'take',
        action: 'TAKE'
      };

      const result = validator.validate(command);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('ENTITY_NOT_FOUND');
        expect(result.error.message).toContain('What do you want to take?');
      }
    });

    test('validates simple entity resolution', () => {
      const command: ParsedCommand = {
        rawInput: 'take box',
        action: 'TAKE',
        directObject: {
          text: 'box',
          candidates: ['box']
        }
      };

      const result = validator.validate(command);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.actionId).toBe('TAKE');
        expect(result.value.directObject?.entity.id).toBe('box1');
      }
    });
  });

  describe('Adjective Matching', () => {
    test('resolves entity with adjective', () => {
      const command: ParsedCommand = {
        rawInput: 'take red ball',
        action: 'TAKE',
        directObject: {
          text: 'red ball',
          candidates: ['red', 'ball'],
          modifiers: ['red']
        }
      };

      const result = validator.validate(command);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.id).toBe('ball1');
      }
    });

    test('distinguishes between similar objects by adjective', () => {
      const command: ParsedCommand = {
        rawInput: 'take blue ball',
        action: 'TAKE',
        directObject: {
          text: 'blue ball',
          candidates: ['blue', 'ball'],
          modifiers: ['blue']
        }
      };

      const result = validator.validate(command);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.id).toBe('ball2');
      }
    });

    test('handles wrong adjective', () => {
      const command: ParsedCommand = {
        rawInput: 'take green ball',
        action: 'TAKE',
        directObject: {
          text: 'green ball',
          candidates: ['green', 'ball'],
          modifiers: ['green']
        }
      };

      const result = validator.validate(command);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('ENTITY_NOT_FOUND');
      }
    });
  });

  describe('Scope Rules', () => {
    test('allows taking visible objects', () => {
      const command: ParsedCommand = {
        rawInput: 'take ball',
        action: 'TAKE',
        directObject: {
          text: 'ball',
          candidates: ['ball']
        }
      };

      const result = validator.validate(command);
      expect(result.success).toBe(true);
    });

    test('allows examining inventory items', () => {
      const command: ParsedCommand = {
        rawInput: 'examine key',
        action: 'EXAMINE',
        directObject: {
          text: 'key',
          candidates: ['key']
        }
      };

      // Add EXAMINE action
      actionRegistry.get = vi.fn((id) => {
        if (id === 'EXAMINE') {
          return {
            id: 'EXAMINE',
            execute: vi.fn(),
            metadata: {
              requiresDirectObject: true,
              requiresIndirectObject: false,
              directObjectScope: 'visible'
            }
          };
        }
        return undefined;
      });

      const result = validator.validate(command);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.id).toBe('key1');
      }
    });

    test('prevents taking objects from other rooms', () => {
      // Add object in different room
      world.setEntityLocation('ball1', 'room2');

      const command: ParsedCommand = {
        rawInput: 'take red ball',
        action: 'TAKE',
        directObject: {
          text: 'red ball',
          candidates: ['red', 'ball']
        }
      };

      const result = validator.validate(command);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('ENTITY_NOT_FOUND');
      }
    });
  });

  describe('Ambiguity Resolution', () => {
    test('returns ambiguity error when multiple matches', () => {
      const command: ParsedCommand = {
        rawInput: 'take ball',
        action: 'TAKE',
        directObject: {
          text: 'ball',
          candidates: ['ball']
        }
      };

      const result = validator.validate(command);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Which ball do you mean?');
        expect(result.error.details?.ambiguousEntities).toHaveLength(2);
      }
    });

    test('auto-resolves when adjectives disambiguate', () => {
      const command: ParsedCommand = {
        rawInput: 'take small ball',
        action: 'TAKE',
        directObject: {
          text: 'small ball',
          candidates: ['small', 'ball'],
          modifiers: ['small']
        }
      };

      const result = validator.validate(command);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.id).toBe('ball1'); // red ball is small
      }
    });

    test('prefers inventory items when ambiguous', () => {
      // Add another key to the room
      const roomKey = world.createEntity('key2', 'iron key');
      roomKey.type = 'key';
      const ironKeyIdentity = {
        type: 'identity',
        name: 'iron key',
        adjectives: ['iron']
      };
      roomKey.add(ironKeyIdentity);
      world.setEntityLocation('key2', 'room1');

      const command: ParsedCommand = {
        rawInput: 'drop key',
        action: 'DROP',
        directObject: {
          text: 'key',
          candidates: ['key']
        }
      };

      // Add DROP action
      actionRegistry.get = vi.fn((id) => {
        if (id === 'DROP') {
          return {
            id: 'DROP',
            execute: vi.fn(),
            metadata: {
              requiresDirectObject: true,
              requiresIndirectObject: false,
              directObjectScope: 'touchable'
            }
          };
        }
        return undefined;
      });

      const result = validator.validate(command);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.id).toBe('key1'); // brass key in inventory
      }
    });
  });

  describe('Synonym Resolution', () => {
    test('resolves entity by synonym', () => {
      const command: ParsedCommand = {
        rawInput: 'take container',
        action: 'TAKE',
        directObject: {
          text: 'container',
          candidates: ['container']
        }
      };

      const result = validator.validate(command);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.id).toBe('box1');
      }
    });

    test('resolves entity by type name', () => {
      const command: ParsedCommand = {
        rawInput: 'take box',
        action: 'TAKE',
        directObject: {
          text: 'box',
          candidates: ['box']
        }
      };

      const result = validator.validate(command);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.type).toBe('box');
      }
    });
  });

  describe('Preposition Validation', () => {
    test('accepts valid preposition', () => {
      const command: ParsedCommand = {
        rawInput: 'put ball in box',
        action: 'PUT',
        directObject: {
          text: 'ball',
          candidates: ['ball'],
          modifiers: ['red']
        },
        preposition: 'in',
        indirectObject: {
          text: 'box',
          candidates: ['box']
        }
      };

      // Resolve ambiguity by using red ball
      command.directObject!.text = 'red ball';

      const result = validator.validate(command);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.parsed.preposition).toBe('in');
      }
    });

    test('rejects invalid preposition', () => {
      const command: ParsedCommand = {
        rawInput: 'put ball beside box',
        action: 'PUT',
        directObject: {
          text: 'red ball',
          candidates: ['red', 'ball']
        },
        preposition: 'beside',
        indirectObject: {
          text: 'box',
          candidates: ['box']
        }
      };

      const result = validator.validate(command);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PRECONDITION_FAILED');
        expect(result.error.message).toContain('beside');
      }
    });
  });

  describe('Debug Events', () => {
    test('emits entity resolution debug events', () => {
      const command: ParsedCommand = {
        rawInput: 'take red ball',
        action: 'TAKE',
        directObject: {
          text: 'red ball',
          candidates: ['red', 'ball']
        }
      };

      validator.validate(command);

      const resolutionEvents = eventSource.events.filter(
        e => e.type === 'entity_resolution'
      );
      
      expect(resolutionEvents.length).toBeGreaterThan(0);
      expect(resolutionEvents[0].data.reference).toEqual(command.directObject);
    });

    test('emits scope check debug events', () => {
      const command: ParsedCommand = {
        rawInput: 'take box',
        action: 'TAKE',
        directObject: {
          text: 'box',
          candidates: ['box']
        }
      };

      validator.validate(command);

      const scopeEvents = eventSource.events.filter(
        e => e.type === 'scope_check'
      );
      
      expect(scopeEvents.length).toBeGreaterThan(0);
      expect(scopeEvents[0].data.requiredScope).toBe('reachable');
      expect(scopeEvents[0].data.entitiesInScope).toBeGreaterThan(0);
    });

    test('emits ambiguity resolution debug events', () => {
      const command: ParsedCommand = {
        rawInput: 'take ball',
        action: 'TAKE',
        directObject: {
          text: 'ball',
          candidates: ['ball']
        }
      };

      validator.validate(command);

      const ambiguityEvents = eventSource.events.filter(
        e => e.type === 'ambiguity_resolution'
      );
      
      expect(ambiguityEvents.length).toBeGreaterThan(0);
      expect(ambiguityEvents[0].data.matchCount).toBe(2);
    });

    test('emits validation error debug events', () => {
      const command: ParsedCommand = {
        rawInput: 'take nothing',
        action: 'TAKE',
        directObject: {
          text: 'nothing',
          candidates: ['nothing']
        }
      };

      validator.validate(command);

      const errorEvents = eventSource.events.filter(
        e => e.type === 'validation_error'
      );
      
      expect(errorEvents.length).toBeGreaterThan(0);
      expect(errorEvents[0].data.errorType).toBe('NO_MATCHES');
    });
  });

  describe('Complex Scenarios', () => {
    test('handles multiple adjectives', () => {
      // Add item with multiple adjectives
      const sword = world.createEntity('sword1', 'ancient golden sword');
      sword.type = 'sword';
      const swordIdentity = {
        type: 'identity',
        name: 'ancient golden sword',
        adjectives: ['ancient', 'golden', 'ornate']
      };
      sword.add(swordIdentity);
      world.setEntityLocation('sword1', 'room1');

      const command: ParsedCommand = {
        rawInput: 'take ancient golden sword',
        action: 'TAKE',
        directObject: {
          text: 'ancient golden sword',
          candidates: ['ancient', 'golden', 'sword'],
          modifiers: ['ancient', 'golden']
        }
      };

      const result = validator.validate(command);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.id).toBe('sword1');
      }
    });

    test('scores exact matches higher than partial matches', () => {
      // Add items with overlapping names
      const goldCoin = world.createEntity('coin1', 'gold coin');
      goldCoin.type = 'coin';
      const coinIdentity = {
        type: 'identity',
        name: 'gold coin',
        adjectives: ['gold']
      };
      goldCoin.add(coinIdentity);
      world.setEntityLocation('coin1', 'room1');

      const goldBar = world.createEntity('bar1', 'gold bar');
      goldBar.type = 'bar';
      const barIdentity = {
        type: 'identity',
        name: 'gold bar',
        adjectives: ['gold', 'heavy']
      };
      goldBar.add(barIdentity);
      world.setEntityLocation('bar1', 'room1');

      const command: ParsedCommand = {
        rawInput: 'take gold coin',
        action: 'TAKE',
        directObject: {
          text: 'gold coin',
          candidates: ['gold', 'coin']
        }
      };

      const result = validator.validate(command);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.id).toBe('coin1');
      }
    });
  });
});

describe('Pronoun Resolution', () => {
  let world: MockWorldModel;
  let actionRegistry: MockActionRegistry;
  let validator: CommandValidatorImpl;

  beforeEach(() => {
    world = new MockWorldModel();
    actionRegistry = new MockActionRegistry();
    validator = new CommandValidatorImpl(world, actionRegistry);
  });

  test('resolves "it" to last interacted object', () => {
    // First command - take ball
    const firstCommand: ParsedCommand = {
      rawInput: 'take red ball',
      action: 'TAKE',
      directObject: {
        text: 'red ball',
        candidates: ['red', 'ball']
      }
    };

    const firstResult = validator.validate(firstCommand);
    expect(firstResult.success).toBe(true);

    // Second command - examine it
    const secondCommand: ParsedCommand = {
      rawInput: 'examine it',
      action: 'EXAMINE',
      directObject: {
        text: 'it',
        candidates: ['it']
      }
    };

    // Add EXAMINE action
    const originalGet = actionRegistry.get.bind(actionRegistry);
    actionRegistry.get = vi.fn((id) => {
      if (id === 'EXAMINE') {
        return {
          id: 'EXAMINE',
          execute: vi.fn(),
          metadata: {
            requiresDirectObject: true,
            requiresIndirectObject: false,
            directObjectScope: 'visible'
          }
        };
      }
      return originalGet(id);
    });

    const secondResult = validator.validate(secondCommand);
    
    expect(secondResult.success).toBe(true);
    if (secondResult.success) {
      expect(secondResult.value.directObject?.entity.id).toBe('ball1');
    }
  });
});
