/**
 * @file Cross-Location Scope Tests
 * @description Tests for scope constraints across different locations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishParser } from '../src/english-parser';
import { ParserLanguageProvider } from '@sharpee/if-domain';
import { Entity } from '@sharpee/core';

// Mock world model with multiple locations
class MockWorldModelWithLocations {
  private entities: Map<string, Entity> = new Map();
  private locations: Map<string, Set<string>> = new Map();
  private inventories: Map<string, Set<string>> = new Map();
  private adjacentLocations: Map<string, Set<string>> = new Map();

  constructor() {
    // Set up test world
    // Living room entities
    const couch: Entity = {
      id: 'couch',
      name: 'couch',
      visible: true,
      portable: false,
      supporter: true
    };
    
    const tv: Entity = {
      id: 'tv',
      name: 'television',
      visible: true,
      portable: false
    };
    
    // Kitchen entities
    const stove: Entity = {
      id: 'stove',
      name: 'stove',
      visible: true,
      portable: false
    };
    
    const pot: Entity = {
      id: 'pot',
      name: 'pot',
      visible: true,
      portable: true,
      noisy: true // For testing sound-based scope
    };
    
    // Garden entities (visible through window)
    const tree: Entity = {
      id: 'tree',
      name: 'tree',
      visible: true,
      portable: false
    };
    
    const bird: Entity = {
      id: 'bird',
      name: 'bird',
      visible: true,
      portable: false
    };

    // Add entities
    this.entities.set('couch', couch);
    this.entities.set('tv', tv);
    this.entities.set('stove', stove);
    this.entities.set('pot', pot);
    this.entities.set('tree', tree);
    this.entities.set('bird', bird);

    // Place entities in locations
    this.locations.set('living_room', new Set(['couch', 'tv']));
    this.locations.set('kitchen', new Set(['stove', 'pot']));
    this.locations.set('garden', new Set(['tree', 'bird']));
    
    // Set up adjacent locations
    this.adjacentLocations.set('living_room', new Set(['kitchen']));
    this.adjacentLocations.set('kitchen', new Set(['living_room']));
    
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
    
    // Get entities from current location
    for (const entityId of locationEntities) {
      const entity = this.entities.get(entityId);
      if (entity && entity.visible) {
        visibleEntities.push(entity);
      }
    }
    
    // Add carried entities
    const carried = this.getCarriedEntities(actorId);
    visibleEntities.push(...carried);
    
    return visibleEntities;
  }

  getTouchableEntities(actorId: string, location: string): Entity[] {
    // Can only touch things in current location or carried
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

  getNearbyEntities(actorId: string, location: string): Entity[] {
    // Get entities from current location
    const visible = this.getVisibleEntities(actorId, location);
    const nearbyEntities = [...visible];
    
    // Add entities from adjacent locations
    const adjacent = this.adjacentLocations.get(location) || new Set();
    for (const adjacentLoc of adjacent) {
      const adjEntities = this.locations.get(adjacentLoc) || new Set();
      for (const entityId of adjEntities) {
        const entity = this.entities.get(entityId);
        if (entity && entity.visible) {
          nearbyEntities.push(entity);
        }
      }
    }
    
    return nearbyEntities;
  }
}

// Mock language provider
const mockLanguageProvider: ParserLanguageProvider = {
  getVerbs: () => [
    {
      actionId: 'if.action.examining',
      verbs: ['examine', 'look', 'x'],
      pattern: 'VERB_NOUN',
      prepositions: ['at']
    },
    {
      actionId: 'if.action.listening',
      verbs: ['listen'],
      pattern: 'VERB_NOUN',
      prepositions: ['to']
    }
  ],
  getNouns: () => [],
  getAdjectives: () => [],
  getPrepositions: () => ['at', 'to', 'from', 'with'],
  getDeterminers: () => ['the', 'a', 'an'],
  getConjunctions: () => ['and', 'or'],
  getNumbers: () => ['one', 'two', 'three'],
  getSpecialWords: () => [],
  getDirections: () => []
};

describe('Cross-Location Scope Constraints', () => {
  let parser: EnglishParser;
  let world: MockWorldModelWithLocations;

  beforeEach(() => {
    parser = new EnglishParser(mockLanguageProvider);
    world = new MockWorldModelWithLocations();
  });

  describe('visible() scope in different locations', () => {
    it('should only see entities in current location', () => {
      parser.setWorldContext(world, 'player', 'living_room');
      
      // Should see couch in living room
      const result1 = parser.parse('examine couch');
      expect(result1.success).toBe(true);
      
      // Should not see stove in kitchen
      const result2 = parser.parse('examine stove');
      expect(result2.success).toBe(false);
    });

    it('should see different entities when location changes', () => {
      // Start in living room
      parser.setWorldContext(world, 'player', 'living_room');
      const result1 = parser.parse('examine couch');
      expect(result1.success).toBe(true);
      
      // Move to kitchen
      parser.setWorldContext(world, 'player', 'kitchen');
      const result2 = parser.parse('examine stove');
      expect(result2.success).toBe(true);
      
      // Can no longer see couch
      const result3 = parser.parse('examine couch');
      expect(result3.success).toBe(false);
    });
  });

  describe('nearby() scope across adjacent locations', () => {
    it('should see entities in adjacent locations with nearby scope', () => {
      parser.setWorldContext(world, 'player', 'living_room');
      
      // First add a custom grammar rule that uses nearby() scope
      const grammar = parser['grammarEngine'].createBuilder();
      grammar
        .define('sense :target')
        .where('target', (scope: any) => scope.nearby())
        .mapsTo('if.action.sensing')
        .withPriority(100)
        .build();
      
      // Should sense pot in adjacent kitchen
      const result = parser.parse('sense pot');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.sensing');
        expect(result.value.structure.directObject).toBe('pot');
      }
    });
  });

  describe('carried() scope across locations', () => {
    it('should see carried items regardless of location', () => {
      // Put pot in inventory
      world['inventories'].set('player', new Set(['pot']));
      
      // Start in living room (pot normally in kitchen)
      parser.setWorldContext(world, 'player', 'living_room');
      
      const result = parser.parse('examine pot');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.structure.directObject).toBe('pot');
      }
    });
  });
});