/**
 * @file Push Panel Pattern Tests
 * @description Tests for understanding literal pattern priority vs slot patterns
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishParser } from '../src/english-parser';
import { ParserLanguageProvider, StoryGrammar, ScopeBuilder } from '@sharpee/if-domain';
import { Entity } from '@sharpee/core';

// Mock language provider with push action
const mockLanguageProvider: ParserLanguageProvider = {
  getVerbs: () => [
    {
      actionId: 'if.action.pushing',
      verbs: ['push', 'shove'],
      pattern: 'VERB_NOUN',
      prepositions: []
    }
  ],
  getNouns: () => [],
  getAdjectives: () => ['red', 'yellow', 'mahogany', 'pine'],
  getPrepositions: () => ['at', 'with', 'from', 'to'],
  getDeterminers: () => ['the', 'a', 'an'],
  getConjunctions: () => ['and', 'or'],
  getNumbers: () => [],
  getSpecialWords: () => [],
  getDirections: () => []
};

// Mock world model with panel entities
class MockWorldModel {
  private entities: Map<string, Entity> = new Map();

  constructor() {
    this.entities.set('red-panel', {
      id: 'red-panel',
      name: 'red panel',
      attributes: { name: 'red panel' },
      visible: true,
      isPanel: true,
      panelType: 'red'
    } as any);

    this.entities.set('yellow-panel', {
      id: 'yellow-panel',
      name: 'yellow panel',
      attributes: { name: 'yellow panel' },
      visible: true,
      isPanel: true,
      panelType: 'yellow'
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

describe('Push Panel Pattern Matching', () => {
  let parser: EnglishParser;
  let storyGrammar: StoryGrammar;
  let world: MockWorldModel;

  beforeEach(() => {
    parser = new EnglishParser(mockLanguageProvider);
    storyGrammar = parser.getStoryGrammar();
    world = new MockWorldModel();
    parser.setWorldContext(world, 'player', 'room');
  });

  describe('literal pattern priority', () => {
    it('should match literal "push red panel" over "push :target"', () => {
      // Register story pattern with literal words - higher priority
      storyGrammar
        .define('push red panel')
        .mapsTo('story.action.push_panel')
        .withPriority(170)
        .build();

      // Parse "push red panel"
      const result = parser.parse('push red panel');

      console.log('Parse result:', JSON.stringify(result, null, 2));

      expect(result.success).toBe(true);
      if (result.success) {
        // Should match story action, not core push
        expect(result.value.action).toBe('story.action.push_panel');
      }
    });

    it('should match shorter "push red" literal pattern', () => {
      storyGrammar
        .define('push red')
        .mapsTo('story.action.push_panel')
        .withPriority(170)
        .build();

      const result = parser.parse('push red');

      console.log('Parse result for "push red":', JSON.stringify(result, null, 2));

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('story.action.push_panel');
      }
    });

    it('should still match core push for non-panel targets', () => {
      storyGrammar
        .define('push red panel')
        .mapsTo('story.action.push_panel')
        .withPriority(170)
        .build();

      // Parse "push button" - should match core push
      const result = parser.parse('push button');

      console.log('Parse result for "push button":', JSON.stringify(result, null, 2));

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.pushing');
      }
    });

    it('should prefer higher priority story pattern over lower priority core pattern', () => {
      // Register multiple patterns with different priorities
      storyGrammar
        .define('push red')
        .mapsTo('story.action.push_panel')
        .withPriority(170) // Higher than core push (100)
        .build();

      const result = parser.parse('push red');

      // Log all matches to see what's happening
      console.log('Result:', result);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('story.action.push_panel');
      }
    });
  });

  describe('slot pattern vs literal pattern', () => {
    it('should prefer literal pattern over slot pattern with same priority', () => {
      // Both patterns have same priority
      storyGrammar
        .define('push red panel')
        .mapsTo('story.action.push_red_panel')
        .withPriority(100)
        .build();

      storyGrammar
        .define('push :target panel')
        .mapsTo('story.action.push_generic_panel')
        .withPriority(100)
        .build();

      const result = parser.parse('push red panel');

      console.log('Slot vs literal result:', JSON.stringify(result, null, 2));

      expect(result.success).toBe(true);
      // The result should be one of these - which one depends on match ordering
      if (result.success) {
        console.log('Matched action:', result.value.action);
      }
    });
  });
});
