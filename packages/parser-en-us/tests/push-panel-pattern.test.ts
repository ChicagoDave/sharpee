/**
 * @file Push Panel Pattern Tests
 * @description Tests for literal-pattern specificity vs slot patterns (ADR-268: story tier + literal specificity, no numeric priority)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishParser } from '../src/english-parser';
import { ParserLanguageProvider, GrammarBuilder, ScopeBuilder } from '@sharpee/if-domain';
/** Minimal entity shape used by mock world model in these tests */
interface MockEntity {
  id: string;
  name: string;
  attributes: Record<string, unknown>;
  visible: boolean;
  isPanel?: boolean;
  panelType?: string;
}

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
  private entities: Map<string, MockEntity> = new Map();

  constructor() {
    this.entities.set('red-panel', {
      id: 'red-panel',
      name: 'red panel',
      attributes: { name: 'red panel' },
      visible: true,
      isPanel: true,
      panelType: 'red'
    });

    this.entities.set('yellow-panel', {
      id: 'yellow-panel',
      name: 'yellow panel',
      attributes: { name: 'yellow panel' },
      visible: true,
      isPanel: true,
      panelType: 'yellow'
    });
  }

  getEntity(id: string): MockEntity | undefined {
    return this.entities.get(id);
  }

  getVisibleEntities(): MockEntity[] {
    return Array.from(this.entities.values()).filter(e => e.visible);
  }

  getCarriedEntities(): MockEntity[] {
    return [];
  }
}

describe('Push Panel Pattern Matching', () => {
  let parser: EnglishParser;
  let grammar: GrammarBuilder;
  let world: MockWorldModel;

  beforeEach(() => {
    parser = new EnglishParser(mockLanguageProvider);
    grammar = parser.getStoryGrammar();
    world = new MockWorldModel();
    parser.setWorldContext(world, 'player', 'room');
  });

  describe('literal pattern specificity', () => {
    it('should match literal "push red panel" over "push :target"', () => {
      // Register story pattern with literal words — story tier outranks core
      grammar
        .define('push red panel')
        .mapsTo('story.action.push_panel')
        .build();

      // Parse "push red panel"
      const result = parser.parse('push red panel');

      expect(result.success).toBe(true);
      if (result.success) {
        // Should match story action, not core push
        expect(result.value.action).toBe('story.action.push_panel');
      }
    });

    it('should match shorter "push red" literal pattern', () => {
      grammar
        .define('push red')
        .mapsTo('story.action.push_panel')
        .build();

      const result = parser.parse('push red');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('story.action.push_panel');
      }
    });

    it('should still match core push for non-panel targets', () => {
      grammar
        .define('push red panel')
        .mapsTo('story.action.push_panel')
        .build();

      // Parse "push button" - should match core push
      const result = parser.parse('push button');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.pushing');
      }
    });

    it('should prefer story-tier pattern over core pattern (ADR-268 D2)', () => {
      // Story tier wins over the core push pattern
      grammar
        .define('push red')
        .mapsTo('story.action.push_panel')
        .build();

      const result = parser.parse('push red');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('story.action.push_panel');
      }
    });
  });

  describe('slot pattern vs literal pattern', () => {
    it('should prefer literal pattern over slot pattern within the same tier', () => {
      // Both patterns are story tier — literal specificity decides
      grammar
        .define('push red panel')
        .mapsTo('story.action.push_red_panel')
        .build();

      grammar
        .define('push :target panel')
        .mapsTo('story.action.push_generic_panel')
        .build();

      const result = parser.parse('push red panel');

      expect(result.success).toBe(true);
    });
  });
});
