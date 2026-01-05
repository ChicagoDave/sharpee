/**
 * @file Action Grammar Builder Tests
 * @description Unit tests for ADR-087 Action-Centric Grammar Builder
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishGrammarEngine } from '../src/english-grammar-engine';
import { Token, ScopeBuilder } from '@sharpee/if-domain';

describe('ADR-087: Action Grammar Builder', () => {
  let engine: EnglishGrammarEngine;
  let grammar: ReturnType<typeof engine.createBuilder>;

  beforeEach(() => {
    engine = new EnglishGrammarEngine();
    grammar = engine.createBuilder();
  });

  // Helper function to create tokens
  function createTokens(words: string[]): Token[] {
    return words.map((word, index) => ({
      word,
      normalized: word.toLowerCase(),
      position: index * 5,
      candidates: []
    }));
  }

  describe('Verb Alias Expansion', () => {
    it('should generate patterns for multiple verbs with single pattern', () => {
      grammar
        .forAction('if.action.pushing')
        .verbs(['push', 'press', 'shove'])
        .pattern(':target')
        .build();

      const rules = grammar.getRules();
      expect(rules.length).toBe(3);

      // Verify each verb generates a pattern
      const patterns = rules.map(r => r.pattern);
      expect(patterns).toContain('push :target');
      expect(patterns).toContain('press :target');
      expect(patterns).toContain('shove :target');

      // All should map to the same action
      rules.forEach(rule => {
        expect(rule.action).toBe('if.action.pushing');
      });
    });

    it('should generate patterns for multiple verbs with multiple patterns', () => {
      grammar
        .forAction('if.action.pushing')
        .verbs(['push', 'press'])
        .patterns([':target', ':target :direction'])
        .build();

      const rules = grammar.getRules();
      expect(rules.length).toBe(4);

      const patterns = rules.map(r => r.pattern);
      expect(patterns).toContain('push :target');
      expect(patterns).toContain('press :target');
      expect(patterns).toContain('push :target :direction');
      expect(patterns).toContain('press :target :direction');
    });

    it('should generate standalone verb patterns when no pattern template', () => {
      grammar
        .forAction('if.action.waiting')
        .verbs(['wait', 'z'])
        .build();

      const rules = grammar.getRules();
      expect(rules.length).toBe(2);

      const patterns = rules.map(r => r.pattern);
      expect(patterns).toContain('wait');
      expect(patterns).toContain('z');
    });
  });

  describe('Constraints Application', () => {
    it('should apply where constraints to all generated patterns', () => {
      grammar
        .forAction('if.action.pushing')
        .verbs(['push', 'press'])
        .pattern(':target')
        .where('target', (scope: ScopeBuilder) => scope.touchable())
        .build();

      const rules = grammar.getRules();
      expect(rules.length).toBe(2);

      // Each rule should have the constraint on the target slot
      rules.forEach(rule => {
        expect(rule.slots.has('target')).toBe(true);
        const slot = rule.slots.get('target')!;
        expect(slot.constraints.length).toBe(1);
      });
    });

    it('should apply priority to all generated patterns', () => {
      grammar
        .forAction('if.action.pushing')
        .verbs(['push', 'press'])
        .pattern(':target')
        .withPriority(110)
        .build();

      const rules = grammar.getRules();
      rules.forEach(rule => {
        expect(rule.priority).toBe(110);
      });
    });

    it('should apply default semantics to all generated patterns', () => {
      grammar
        .forAction('if.action.pushing')
        .verbs(['push', 'press'])
        .pattern(':target')
        .withDefaultSemantics({ manner: 'forceful' })
        .build();

      const rules = grammar.getRules();
      rules.forEach(rule => {
        expect(rule.defaultSemantics?.manner).toBe('forceful');
      });
    });
  });

  describe('Direction Patterns', () => {
    it('should generate direction patterns with aliases', () => {
      grammar
        .forAction('if.action.going')
        .directions({
          'north': ['north', 'n'],
          'south': ['south', 's']
        })
        .build();

      const rules = grammar.getRules();
      expect(rules.length).toBe(4);

      const patterns = rules.map(r => r.pattern);
      expect(patterns).toContain('north');
      expect(patterns).toContain('n');
      expect(patterns).toContain('south');
      expect(patterns).toContain('s');
    });

    it('should attach direction semantics to direction patterns', () => {
      grammar
        .forAction('if.action.going')
        .directions({
          'north': ['north', 'n']
        })
        .build();

      const rules = grammar.getRules();

      const northRule = rules.find(r => r.pattern === 'north');
      expect(northRule?.defaultSemantics?.direction).toBe('north');

      const nRule = rules.find(r => r.pattern === 'n');
      expect(nRule?.defaultSemantics?.direction).toBe('north');
    });

    it('should use lower priority for single-character abbreviations', () => {
      grammar
        .forAction('if.action.going')
        .directions({
          'north': ['north', 'n']
        })
        .withPriority(100)
        .build();

      const rules = grammar.getRules();

      const northRule = rules.find(r => r.pattern === 'north');
      expect(northRule?.priority).toBe(100);

      const nRule = rules.find(r => r.pattern === 'n');
      expect(nRule?.priority).toBe(90); // Lower for abbreviation
    });
  });

  describe('Combined Usage', () => {
    it('should handle verbs, patterns, and directions together', () => {
      grammar
        .forAction('if.action.going')
        .verbs(['go', 'walk'])
        .pattern(':direction')
        .directions({
          'north': ['north', 'n']
        })
        .build();

      const rules = grammar.getRules();
      // 2 verbs × 1 pattern = 2, plus 2 direction aliases = 4 total
      expect(rules.length).toBe(4);

      const patterns = rules.map(r => r.pattern);
      expect(patterns).toContain('go :direction');
      expect(patterns).toContain('walk :direction');
      expect(patterns).toContain('north');
      expect(patterns).toContain('n');
    });
  });

  describe('Pattern Matching Integration', () => {
    it('should match patterns generated by forAction', () => {
      grammar
        .forAction('if.action.pushing')
        .verbs(['push', 'press'])
        .pattern(':target')
        .build();

      const tokens = createTokens(['press', 'button']);
      // Add a candidate for the entity
      tokens[1].candidates = [{
        partOfSpeech: 'noun' as any,
        mapsTo: 'button-1',
        priority: 1
      }];

      const context = {
        world: undefined as any,
        actorId: 'player',
        currentLocation: 'room-1',
        slots: new Map()
      };

      const matches = engine.findMatches(tokens, context);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].rule.action).toBe('if.action.pushing');
    });

    it('should match direction patterns with semantics', () => {
      grammar
        .forAction('if.action.going')
        .directions({
          'north': ['north', 'n']
        })
        .build();

      const tokens = createTokens(['n']);
      const context = {
        world: undefined as any,
        actorId: 'player',
        currentLocation: 'room-1',
        slots: new Map()
      };

      const matches = engine.findMatches(tokens, context);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].rule.action).toBe('if.action.going');
      expect(matches[0].semantics?.direction).toBe('north');
    });
  });
});
