/**
 * @file Grammar Scope Tests
 * @description Tests for grammar patterns and trait constraints.
 *
 * NOTE: Grammar no longer enforces scope (visible/touchable/carried).
 * Scope validation happens in action validate() phase.
 * Grammar only declares semantic constraints (traits).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishParser } from '../src/english-parser';
import { ParserLanguageProvider } from '@sharpee/if-domain';
import { Entity } from '@sharpee/core';

// Mock world model
class MockWorldModel {
  private entities: Map<string, Entity> = new Map();
  private locations: Map<string, Set<string>> = new Map();
  private inventories: Map<string, Set<string>> = new Map();

  constructor() {
    // Set up test world
    const sword: Entity = {
      id: 'sword',
      name: 'sword',
      attributes: { name: 'sword' },
      visible: true,
      portable: true
    } as any;
    
    const guard: Entity = {
      id: 'guard',
      name: 'guard',
      attributes: { name: 'guard' },
      visible: true,
      portable: false,
      animate: true,
      // Support trait checking for hasTrait() in grammar
      has: (traitType: string) => traitType === 'actor'
    } as any;
    
    const ball: Entity = {
      id: 'ball',
      name: 'ball',
      attributes: { name: 'ball' },
      visible: true,
      portable: true
    } as any;
    
    const window: Entity = {
      id: 'window',
      name: 'window',
      attributes: { name: 'window' },
      visible: true,
      portable: false
    } as any;
    
    const hiddenKey: Entity = {
      id: 'hidden_key',
      name: 'key',
      attributes: { name: 'key' },
      visible: false,
      portable: true
    } as any;

    // Add entities
    this.entities.set('sword', sword);
    this.entities.set('guard', guard);
    this.entities.set('ball', ball);
    this.entities.set('window', window);
    this.entities.set('hidden_key', hiddenKey);

    // Place entities in locations
    this.locations.set('room', new Set(['sword', 'guard', 'ball', 'window', 'hidden_key']));
    
    // Player inventory
    this.inventories.set('player', new Set());
  }

  getEntity(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  getVisibleEntities(actorId: string, location: string): Entity[] {
    const locationEntities = this.locations.get(location) || new Set();
    const visibleEntities: Entity[] = [];
    
    for (const entityId of locationEntities) {
      const entity = this.entities.get(entityId);
      if (entity && entity.visible) {
        visibleEntities.push(entity);
      }
    }
    
    return visibleEntities;
  }

  getTouchableEntities(actorId: string, location: string): Entity[] {
    // For this mock, touchable = visible
    return this.getVisibleEntities(actorId, location);
  }

  getCarriedEntities(actorId: string): Entity[] {
    const inventory = this.inventories.get(actorId) || new Set();
    const carried: Entity[] = [];
    
    for (const entityId of inventory) {
      const entity = this.entities.get(entityId);
      if (entity) {
        carried.push(entity);
      }
    }
    
    return carried;
  }

  // Helper to move entity to inventory
  moveToInventory(entityId: string, actorId: string): void {
    // Remove from all locations
    for (const [, entities] of this.locations) {
      entities.delete(entityId);
    }
    
    // Add to inventory
    const inventory = this.inventories.get(actorId) || new Set();
    inventory.add(entityId);
    this.inventories.set(actorId, inventory);
  }
}

// Mock language provider
const mockLanguageProvider: ParserLanguageProvider = {
  getVerbs: () => [
    {
      actionId: 'if.action.taking',
      verbs: ['take', 'get', 'pick', 'grab'],
      pattern: 'VERB_NOUN',
      prepositions: []
    },
    {
      actionId: 'if.action.giving',
      verbs: ['give'],
      pattern: 'VERB_NOUN_NOUN',
      prepositions: []
    },
    {
      actionId: 'if.action.throwing',
      verbs: ['throw'],
      pattern: 'VERB_NOUN_PREP_NOUN',
      prepositions: ['at']
    }
  ],
  getNouns: () => [],
  getAdjectives: () => [],
  getPrepositions: () => ['at', 'to', 'from', 'with'],
  getDeterminers: () => ['the', 'a', 'an'],
  getConjunctions: () => ['and', 'or'],
  getNumbers: () => ['one', 'two', 'three'],
  getSpecialWords: () => [{
    word: 'all',
    mapsTo: 'all',
    priority: 100
  }],
  getDirections: () => []
};

describe('Grammar Scope Constraints', () => {
  let parser: EnglishParser;
  let world: MockWorldModel;

  beforeEach(() => {
    parser = new EnglishParser(mockLanguageProvider);
    world = new MockWorldModel();
    parser.setWorldContext(world, 'player', 'room');
  });

  describe('grammar parses regardless of scope', () => {
    // NOTE: Grammar no longer enforces scope. These tests verify that
    // grammar parses successfully - scope validation happens in action validate().

    it('should match visible entities in take command', () => {
      const result = parser.parse('take sword');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.taking');
        expect(result.value.structure.directObject?.text).toBe('sword');
      }
    });

    it('should parse take command even for invisible entities (scope checked in action)', () => {
      const result = parser.parse('take key');

      // Grammar parses successfully - action validate() will check visibility
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.taking');
        expect(result.value.structure.directObject?.text).toBe('key');
      }
    });

    it('should match give command with animate recipient (trait constraint)', () => {
      // Move sword to inventory first
      world.moveToInventory('sword', 'player');

      const result = parser.parse('give guard sword');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.giving');
        expect(result.value.structure.directObject?.text).toBe('sword');
        expect(result.value.structure.indirectObject?.text).toBe('guard');
      }
    });
  });

  describe('grammar parses regardless of carried status', () => {
    // NOTE: Grammar no longer checks .carried() - action validate() does.

    it('should parse give command even when item not carried (scope checked in action)', () => {
      // Don't move sword to inventory - it's just visible in the room

      const result = parser.parse('give guard sword');

      // Grammar parses successfully - action validate() will check carried
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.giving');
      }
    });

    it('should parse give command when item is carried', () => {
      // Move sword to inventory
      world.moveToInventory('sword', 'player');

      const result = parser.parse('give guard sword');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.giving');
      }
    });
  });

  describe('grammar parses regardless of portable status', () => {
    // NOTE: Grammar no longer checks .matching({ portable: true }).
    // SceneryTrait blocking is handled in action validate().

    it('should parse take command for any entity (portability checked in action)', () => {
      const result1 = parser.parse('take sword');
      expect(result1.success).toBe(true);

      const result2 = parser.parse('take guard');
      // Grammar parses successfully - action validate() checks SceneryTrait
      expect(result2.success).toBe(true);
      if (result2.success) {
        expect(result2.value.action).toBe('if.action.taking');
      }
    });
  });

  describe('complex patterns with multiple constraints', () => {
    it('should match throw command with carried item at visible target', () => {
      // Move ball to inventory first
      world.moveToInventory('ball', 'player');
      
      const result = parser.parse('throw ball at window');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.throwing');
        expect(result.value.structure.directObject?.text).toBe('ball');
        expect(result.value.structure.preposition?.text).toBe('at');
        expect(result.value.structure.indirectObject?.text).toBe('window');
      }
    });
  });
});