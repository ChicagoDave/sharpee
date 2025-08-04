/**
 * @file Grammar Scope Tests
 * @description Tests for scope constraint evaluation in the grammar engine
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
      visible: true,
      portable: true
    };
    
    const guard: Entity = {
      id: 'guard',
      name: 'guard',
      visible: true,
      portable: false,
      animate: true
    };
    
    const ball: Entity = {
      id: 'ball',
      name: 'ball',
      visible: true,
      portable: true
    };
    
    const window: Entity = {
      id: 'window',
      name: 'window',
      visible: true,
      portable: false
    };
    
    const hiddenKey: Entity = {
      id: 'hidden_key',
      name: 'key',
      visible: false,
      portable: true
    };

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

  describe('visible() scope constraint', () => {
    it('should match visible entities in take command', () => {
      const result = parser.parse('take sword');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.taking');
        expect(result.value.structure.directObject).toBe('sword');
      }
    });

    it('should not match invisible entities in take command', () => {
      const result = parser.parse('take key');
      
      // Should fail because 'key' is not visible
      expect(result.success).toBe(false);
    });

    it('should match give command with carried item to visible animate recipient', () => {
      // Move sword to inventory first
      world.moveToInventory('sword', 'player');
      
      const result = parser.parse('give guard sword');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.giving');
        expect(result.value.structure.directObject).toBe('sword');
        expect(result.value.structure.indirectObject).toBe('guard');
      }
    });
  });

  describe('carried() scope constraint', () => {
    it('should fail give command when item is not carried', () => {
      // Don't move sword to inventory - it's just visible in the room
      
      const result = parser.parse('give guard sword');
      
      // Should fail because sword is not carried
      expect(result.success).toBe(false);
    });

    it('should succeed give command when item is carried', () => {
      // Move sword to inventory
      world.moveToInventory('sword', 'player');
      
      const result = parser.parse('give guard sword');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.giving');
      }
    });
  });

  describe('portable property constraint', () => {
    it('should only allow taking portable items', () => {
      const result1 = parser.parse('take sword');
      expect(result1.success).toBe(true);
      
      const result2 = parser.parse('take guard');
      // Should fail because guard is not portable
      expect(result2.success).toBe(false);
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
        expect(result.value.structure.directObject).toBe('ball');
        expect(result.value.structure.preposition).toBe('at');
        expect(result.value.structure.indirectObject).toBe('window');
      }
    });
  });
});