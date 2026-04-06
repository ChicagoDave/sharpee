/**
 * @file Grammar Scope Tests
 * @description Representative tests verifying that grammar does NOT enforce scope.
 *
 * Scope validation (visible/touchable/carried) happens in action validate(),
 * not in grammar. Grammar only declares semantic constraints (traits).
 * These tests confirm that the parser successfully parses commands regardless
 * of entity visibility, portability, or location.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishParser } from '../src/english-parser';
import { ParserLanguageProvider } from '@sharpee/if-domain';

/** Minimal entity shape used by mock world model in these tests */
interface MockEntity {
  id: string;
  name: string;
  attributes: Record<string, unknown>;
  visible: boolean;
  portable: boolean;
  animate?: boolean;
  has?: (traitType: string) => boolean;
}

class MockWorldModel {
  private entities: Map<string, MockEntity> = new Map();
  private locations: Map<string, Set<string>> = new Map();
  private inventories: Map<string, Set<string>> = new Map();

  constructor() {
    const sword: MockEntity = {
      id: 'sword', name: 'sword',
      attributes: { name: 'sword' },
      visible: true, portable: true
    };

    const guard: MockEntity = {
      id: 'guard', name: 'guard',
      attributes: { name: 'guard' },
      visible: true, portable: false, animate: true,
      has: (traitType: string) => traitType === 'actor'
    };

    const hiddenKey: MockEntity = {
      id: 'hidden_key', name: 'key',
      attributes: { name: 'key' },
      visible: false, portable: true
    };

    const stove: MockEntity = {
      id: 'stove', name: 'stove',
      attributes: { name: 'stove' },
      visible: true, portable: false
    };

    this.entities.set('sword', sword);
    this.entities.set('guard', guard);
    this.entities.set('hidden_key', hiddenKey);
    this.entities.set('stove', stove);

    this.locations.set('room', new Set(['sword', 'guard', 'hidden_key']));
    this.locations.set('kitchen', new Set(['stove']));
    this.inventories.set('player', new Set());
  }

  getEntity(id: string): MockEntity | undefined {
    return this.entities.get(id);
  }

  getAllEntities(): MockEntity[] {
    return Array.from(this.entities.values());
  }

  getVisibleEntities(actorId: string, location: string): MockEntity[] {
    const locationEntities = this.locations.get(location) || new Set();
    const carried = this.getCarriedEntities(actorId);
    const visible: MockEntity[] = [...carried];
    for (const entityId of locationEntities) {
      const entity = this.entities.get(entityId);
      if (entity && entity.visible) visible.push(entity);
    }
    return visible;
  }

  getTouchableEntities(actorId: string, location: string): MockEntity[] {
    return this.getVisibleEntities(actorId, location);
  }

  getCarriedEntities(actorId: string): MockEntity[] {
    const inventory = this.inventories.get(actorId) || new Set();
    const carried: MockEntity[] = [];
    for (const entityId of inventory) {
      const entity = this.entities.get(entityId);
      if (entity) carried.push(entity);
    }
    return carried;
  }

  moveToInventory(entityId: string, actorId: string): void {
    for (const [, entities] of this.locations) entities.delete(entityId);
    const inventory = this.inventories.get(actorId) || new Set();
    inventory.add(entityId);
    this.inventories.set(actorId, inventory);
  }
}

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

describe('Grammar Scope — Parser Does Not Enforce Scope', () => {
  let parser: EnglishParser;
  let world: MockWorldModel;

  beforeEach(() => {
    parser = new EnglishParser(mockLanguageProvider);
    world = new MockWorldModel();
    parser.setWorldContext(world, 'player', 'room');
  });

  it('should parse take for invisible entities (scope checked in action validate)', () => {
    // hidden_key has visible: false, but grammar should still parse
    const result = parser.parse('take key');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.action).toBe('if.action.taking');
      expect(result.value.structure.directObject?.text).toBe('key');
    }
  });

  it('should parse take for non-portable entities (portability checked in action validate)', () => {
    // guard has portable: false, but grammar should still parse
    const result = parser.parse('take guard');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.action).toBe('if.action.taking');
    }
  });

  it('should parse complex pattern with multiple entity slots', () => {
    world.moveToInventory('sword', 'player');

    const result = parser.parse('throw sword at guard');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.action).toBe('if.action.throwing');
      expect(result.value.structure.directObject?.text).toBe('sword');
      expect(result.value.structure.preposition?.text).toBe('at');
      expect(result.value.structure.indirectObject?.text).toBe('guard');
    }
  });
});
