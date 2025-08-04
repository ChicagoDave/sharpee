/**
 * @file Story Grammar Tests
 * @description Tests for story-specific grammar registration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishParser } from '../src/english-parser';
import { ParserLanguageProvider, StoryGrammar, ScopeBuilder } from '@sharpee/if-domain';
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
      visible: true,
      magical: true
    });
    
    this.entities.set('sword', {
      id: 'sword',
      name: 'sword',
      visible: true,
      portable: true,
      weapon: true
    });
    
    this.entities.set('dragon', {
      id: 'dragon',
      name: 'dragon',
      visible: true,
      creature: true
    });
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
  let storyGrammar: StoryGrammar;
  let world: MockWorldModel;

  beforeEach(() => {
    parser = new EnglishParser(mockLanguageProvider);
    storyGrammar = parser.getStoryGrammar();
    world = new MockWorldModel();
    parser.setWorldContext(world, 'player', 'room');
  });

  describe('basic pattern registration', () => {
    it('should register a simple story pattern', () => {
      storyGrammar
        .define('cast :spell')
        .mapsTo('story.action.casting')
        .withPriority(100)
        .build();

      const result = parser.parse('cast fireball');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('story.action.casting');
        expect(result.value.structure.directObject).toBe('fireball');
      }
    });

    it('should register pattern with constraints', () => {
      storyGrammar
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

    it('should support experimental patterns with lower confidence', () => {
      storyGrammar
        .define('meditate on :subject')
        .experimental()
        .mapsTo('story.action.meditating')
        .build();

      const result = parser.parse('meditate on existence');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.confidence).toBeLessThan(1.0);
      }
    });
  });

  describe('pattern overriding', () => {
    it('should override core patterns with higher priority', () => {
      // Override the core 'take' action
      storyGrammar
        .override('if.action.taking', 'acquire :item')
        .build();

      // New pattern should work
      const result1 = parser.parse('acquire sword');
      expect(result1.success).toBe(true);
      if (result1.success) {
        expect(result1.value.action).toBe('if.action.taking');
      }

      // Original pattern should still work
      const result2 = parser.parse('take sword');
      expect(result2.success).toBe(true);
    });
  });

  describe('pattern extension', () => {
    it('should extend existing patterns with additional constraints', () => {
      // Extend examining to require magical items
      storyGrammar
        .extend('if.action.examining')
        .where('object', (scope: ScopeBuilder) => scope.visible().matching({ magical: true }))
        .withHigherPriority(20)
        .build();

      // Should work with magical crystal
      const result1 = parser.parse('examine crystal');
      expect(result1.success).toBe(true);

      // Regular examine should still work (lower priority)
      const result2 = parser.parse('examine sword');
      expect(result2.success).toBe(true);
    });
  });

  describe('pattern management', () => {
    it('should track story rules separately', () => {
      // Add some story rules
      storyGrammar
        .define('enchant :item')
        .mapsTo('story.action.enchanting')
        .build();

      storyGrammar
        .define('summon :creature')
        .mapsTo('story.action.summoning')
        .build();

      const rules = storyGrammar.getRules();
      expect(rules.length).toBe(2);
      expect(rules.every(r => r.action.startsWith('story.'))).toBe(true);
    });

    it('should clear story rules without affecting core rules', () => {
      // Add story rule
      storyGrammar
        .define('teleport to :location')
        .mapsTo('story.action.teleporting')
        .build();

      // Verify it works
      const result1 = parser.parse('teleport to castle');
      expect(result1.success).toBe(true);

      // Clear story rules
      storyGrammar.clear();

      // Story pattern should no longer work
      const result2 = parser.parse('teleport to castle');
      expect(result2.success).toBe(false);

      // Core patterns should still work
      const result3 = parser.parse('take sword');
      expect(result3.success).toBe(true);
    });
  });

  describe('debugging features', () => {
    it('should support debug mode with event callbacks', () => {
      const debugEvents: any[] = [];
      
      storyGrammar.setDebugMode(true);
      (storyGrammar as any).setDebugCallback((event: any) => {
        debugEvents.push(event);
      });

      // Register a pattern
      storyGrammar
        .define('debug :action')
        .describe('Test pattern for debugging')
        .mapsTo('story.action.debugging')
        .build();

      expect(debugEvents.length).toBe(1);
      expect(debugEvents[0].type).toBe('pattern_registered');
      expect(debugEvents[0].pattern).toBe('debug :action');
    });

    it('should provide grammar statistics', () => {
      // Add some patterns
      storyGrammar
        .define('fly')
        .mapsTo('story.action.flying')
        .build();

      storyGrammar
        .override('if.action.taking', 'grab :item')
        .build();

      const stats = (storyGrammar as any).getStats();
      expect(stats.storyRules).toBeGreaterThan(0);
      expect(stats.totalRules).toBeGreaterThan(stats.storyRules);
    });
  });

  describe('complex story patterns', () => {
    it('should handle multi-slot story patterns', () => {
      storyGrammar
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
        expect(result.value.structure.directObject).toBe('dragon');
        // 'with' patterns store the tool in extras
        expect((result.value as any).extras?.weapon?.text).toBe('sword');
      }
    });
  });
});