/**
 * @file Story Grammar Tests
 * @description Tests for story-specific grammar registration via GrammarBuilder
 *
 * ADR-084: Stories now get direct access to GrammarBuilder, giving them
 * full access to all PatternBuilder methods without a wrapper layer.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishParser } from '../src/english-parser';
import { ParserLanguageProvider, GrammarBuilder, ScopeBuilder } from '@sharpee/if-domain';
import { Entity } from '@sharpee/core';

// Mock language provider
const mockLanguageProvider: ParserLanguageProvider = {
  getVerbs: () => [
    {
      actionId: 'if.action.taking',
      verbs: ['take', 'get'],
      pattern: 'VERB_NOUN',
      prepositions: []
    },
    {
      actionId: 'if.action.examining',
      verbs: ['examine', 'x', 'look'],
      pattern: 'VERB_NOUN',
      prepositions: ['at']
    }
  ],
  getNouns: () => [],
  getAdjectives: () => [],
  getPrepositions: () => ['at', 'with', 'from', 'to'],
  getDeterminers: () => ['the', 'a', 'an'],
  getConjunctions: () => ['and', 'or'],
  getNumbers: () => [],
  getSpecialWords: () => [],
  getDirections: () => []
};

// Mock world model
class MockWorldModel {
  private entities: Map<string, Entity> = new Map();

  constructor() {
    this.entities.set('crystal', {
      id: 'crystal',
      name: 'crystal',
      attributes: { name: 'crystal' },
      visible: true,
      magical: true
    } as any);

    this.entities.set('sword', {
      id: 'sword',
      name: 'sword',
      attributes: { name: 'sword' },
      visible: true,
      portable: true,
      weapon: true
    } as any);

    this.entities.set('dragon', {
      id: 'dragon',
      name: 'dragon',
      attributes: { name: 'dragon' },
      visible: true,
      creature: true
    } as any);
  }

  getEntity(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  getVisibleEntities(): Entity[] {
    return Array.from(this.entities.values()).filter(e => e.visible);
  }

  getCarriedEntities(): Entity[] {
    return [];
  }
}

describe('Story Grammar API', () => {
  let parser: EnglishParser;
  let grammar: GrammarBuilder;
  let world: MockWorldModel;

  beforeEach(() => {
    parser = new EnglishParser(mockLanguageProvider);
    grammar = parser.getStoryGrammar();
    world = new MockWorldModel();
    parser.setWorldContext(world, 'player', 'room');
  });

  describe('basic pattern registration', () => {
    it('should register a simple story pattern', () => {
      grammar
        .define('cast :spell')
        .mapsTo('story.action.casting')
        .withPriority(100)
        .build();

      const result = parser.parse('cast fireball');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('story.action.casting');
        expect(result.value.structure.directObject?.text).toBe('fireball');
      }
    });

    it('should register pattern with constraints', () => {
      grammar
        .define('scry :target')
        .where('target', (scope: ScopeBuilder) => scope.visible().matching({ magical: true }))
        .mapsTo('story.action.scrying')
        .build();

      // Should work with magical crystal
      const result1 = parser.parse('scry crystal');
      expect(result1.success).toBe(true);
      if (result1.success) {
        expect(result1.value.action).toBe('story.action.scrying');
      }

      // Should fail with non-magical sword
      const result2 = parser.parse('scry sword');
      expect(result2.success).toBe(false);
    });
  });

  describe('ADR-084: full PatternBuilder access', () => {
    it('should allow .direction() for direction-constrained slots', () => {
      grammar
        .define('push :direction wall')
        .direction('direction')
        .mapsTo('story.action.push_wall')
        .withPriority(175)
        .build();

      const result = parser.parse('push east wall');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('story.action.push_wall');
      }
    });

    it('should allow .text() for raw text capture', () => {
      grammar
        .define('say :words...')
        .text('words')
        .mapsTo('story.action.saying')
        .build();

      const result = parser.parse('say hello world');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('story.action.saying');
        expect(result.value.textSlots?.get('words')).toBe('hello world');
      }
    });
  });

  describe('complex story patterns', () => {
    it('should handle multi-slot story patterns', () => {
      grammar
        .define('attack :target with :weapon')
        .where('target', (scope: ScopeBuilder) => scope.visible().matching({ creature: true }))
        .where('weapon', (scope: ScopeBuilder) => scope.carried().matching({ weapon: true }))
        .mapsTo('story.action.attacking')
        .withPriority(120)
        .build();

      // Move sword to inventory
      world['entities'].set('sword', {
        ...world.getEntity('sword')!,
        visible: false
      });
      world['getCarriedEntities'] = () => [world.getEntity('sword')!];

      const result = parser.parse('attack dragon with sword');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('story.action.attacking');
        expect(result.value.structure.directObject?.text).toBe('dragon');
        // 'with' patterns store the tool in extras
        expect((result.value as any).extras?.weapon?.text).toBe('sword');
      }
    });
  });
});
