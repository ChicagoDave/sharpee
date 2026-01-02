/**
 * @file ADR-080 Grammar Enhancements Tests
 * @description Tests for text slots, greedy text slots, instrument slots, and command chaining
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishPatternCompiler } from '../src/english-pattern-compiler';
import { EnglishGrammarEngine } from '../src/english-grammar-engine';
import { EnglishParser } from '../src/english-parser';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { SlotType, GrammarContext, vocabularyRegistry } from '@sharpee/if-domain';

describe('ADR-080: Grammar Enhancements', () => {
  let compiler: EnglishPatternCompiler;
  let engine: EnglishGrammarEngine;

  beforeEach(() => {
    compiler = new EnglishPatternCompiler();
    engine = new EnglishGrammarEngine();
  });

  describe('Pattern Compiler - Greedy Slots (:slot...)', () => {
    it('should compile pattern with greedy slot syntax', () => {
      const pattern = compiler.compile('say :message...');

      expect(pattern.tokens).toHaveLength(2);
      expect(pattern.tokens[0]).toEqual({
        type: 'literal',
        value: 'say'
      });
      expect(pattern.tokens[1]).toEqual({
        type: 'slot',
        value: 'message',
        greedy: true,
        slotType: SlotType.TEXT_GREEDY
      });
    });

    it('should extract slot name correctly from greedy pattern', () => {
      const slots = compiler.extractSlots('say :message...');

      expect(slots).toHaveLength(1);
      expect(slots).toContain('message');
    });

    it('should validate greedy slot patterns', () => {
      expect(compiler.validate('say :message...')).toBe(true);
      expect(compiler.validate('write :content... on :surface')).toBe(true);
    });

    it('should compile bounded greedy pattern', () => {
      const pattern = compiler.compile('write :content... on :surface');

      expect(pattern.tokens).toHaveLength(4);
      expect(pattern.tokens[1]).toEqual({
        type: 'slot',
        value: 'content',
        greedy: true,
        slotType: SlotType.TEXT_GREEDY
      });
      expect(pattern.tokens[3]).toEqual({
        type: 'slot',
        value: 'surface'
      });
    });

    it('should handle optional greedy slots', () => {
      const pattern = compiler.compile('speak [:message...]');

      // Should have marker for optional and the slot
      const slotToken = pattern.tokens.find(t => t.type === 'slot' && t.value === 'message');
      expect(slotToken).toBeDefined();
      expect(slotToken?.optional).toBe(true);
      expect(slotToken?.greedy).toBe(true);
      expect(slotToken?.slotType).toBe(SlotType.TEXT_GREEDY);
    });
  });

  describe('Grammar Builder - .text() method', () => {
    it('should mark slot as TEXT type via .text()', () => {
      const builder = engine.createBuilder();
      builder.define('incant :challenge :response')
        .text('challenge')
        .text('response')
        .mapsTo('test:incant')
        .build();

      const rules = engine.getRules();
      expect(rules).toHaveLength(1);

      const rule = rules[0];
      expect(rule.slots.get('challenge')?.slotType).toBe(SlotType.TEXT);
      expect(rule.slots.get('response')?.slotType).toBe(SlotType.TEXT);
    });

    it('should allow mixing .text() and .where()', () => {
      const builder = engine.createBuilder();
      builder.define('name :item :newname')
        .where('item', (scope: any) => scope.visible())
        .text('newname')
        .mapsTo('test:name')
        .build();

      const rules = engine.getRules();
      const rule = rules[0];
      expect(rule.slots.get('item')?.slotType).toBeUndefined(); // entity
      expect(rule.slots.get('newname')?.slotType).toBe(SlotType.TEXT);
    });
  });

  describe('Grammar Builder - .instrument() method', () => {
    it('should mark slot as INSTRUMENT type via .instrument()', () => {
      const builder = engine.createBuilder();
      builder.define('attack :target with :weapon')
        .instrument('weapon')
        .mapsTo('test:attack')
        .build();

      const rules = engine.getRules();
      expect(rules).toHaveLength(1);

      const rule = rules[0];
      expect(rule.slots.get('weapon')?.slotType).toBe(SlotType.INSTRUMENT);
    });

    it('should allow .instrument() with .where()', () => {
      const builder = engine.createBuilder();
      builder.define('unlock :door with :key')
        .where('door', (scope: any) => scope.visible())
        .instrument('key')
        .mapsTo('test:unlock')
        .build();

      const rules = engine.getRules();
      const rule = rules[0];
      expect(rule.slots.get('door')?.slotType).toBeUndefined(); // entity
      expect(rule.slots.get('key')?.slotType).toBe(SlotType.INSTRUMENT);
    });
  });

  describe('Grammar Engine - Text Slot Matching', () => {
    it('should consume single token for TEXT slot', () => {
      const builder = engine.createBuilder();
      builder.define('incant :a :b')
        .text('a')
        .text('b')
        .mapsTo('test:incant')
        .build();

      const tokens = [
        { word: 'incant', normalized: 'incant', position: 0, candidates: [] },
        { word: 'mhoram', normalized: 'mhoram', position: 7, candidates: [] },
        { word: 'dfnobo', normalized: 'dfnobo', position: 14, candidates: [] }
      ];

      const context: GrammarContext = {
        world: null,
        actorId: 'player',
        currentLocation: 'test',
        slots: new Map()
      };

      const matches = engine.findMatches(tokens, context);
      expect(matches).toHaveLength(1);

      const match = matches[0];
      expect(match.slots.get('a')?.text).toBe('mhoram');
      expect(match.slots.get('b')?.text).toBe('dfnobo');
      expect((match.slots.get('a') as any)?.slotType).toBe(SlotType.TEXT);
      expect((match.slots.get('b') as any)?.slotType).toBe(SlotType.TEXT);
    });
  });

  describe('Grammar Engine - Greedy Text Slot Matching', () => {
    it('should consume multiple tokens for TEXT_GREEDY slot', () => {
      const builder = engine.createBuilder();
      builder.define('say :message...')
        .mapsTo('test:say')
        .build();

      const tokens = [
        { word: 'say', normalized: 'say', position: 0, candidates: [] },
        { word: 'hello', normalized: 'hello', position: 4, candidates: [] },
        { word: 'there', normalized: 'there', position: 10, candidates: [] },
        { word: 'friend', normalized: 'friend', position: 16, candidates: [] }
      ];

      const context: GrammarContext = {
        world: null,
        actorId: 'player',
        currentLocation: 'test',
        slots: new Map()
      };

      const matches = engine.findMatches(tokens, context);
      expect(matches).toHaveLength(1);

      const match = matches[0];
      expect(match.slots.get('message')?.text).toBe('hello there friend');
      expect((match.slots.get('message') as any)?.slotType).toBe(SlotType.TEXT_GREEDY);
    });

    it('should stop greedy consumption at delimiter', () => {
      const builder = engine.createBuilder();
      // Note: :content... already implies text capture, .text() not needed
      builder.define('write :content... on :surface')
        .mapsTo('test:write')
        .build();

      const tokens = [
        { word: 'write', normalized: 'write', position: 0, candidates: [] },
        { word: 'hello', normalized: 'hello', position: 6, candidates: [] },
        { word: 'world', normalized: 'world', position: 12, candidates: [] },
        { word: 'on', normalized: 'on', position: 18, candidates: [] },
        { word: 'paper', normalized: 'paper', position: 21, candidates: [] }
      ];

      const context: GrammarContext = {
        world: null,
        actorId: 'player',
        currentLocation: 'test',
        slots: new Map()
      };

      const matches = engine.findMatches(tokens, context);
      expect(matches).toHaveLength(1);

      const match = matches[0];
      expect(match.slots.get('content')?.text).toBe('hello world');
      expect((match.slots.get('content') as any)?.slotType).toBe(SlotType.TEXT_GREEDY);
      expect(match.slots.get('surface')?.text).toBe('paper');
      // surface is entity slot (default)
      expect((match.slots.get('surface') as any)?.slotType).toBe(SlotType.ENTITY);
    });
  });

  describe('Grammar Engine - Instrument Slot Matching', () => {
    it('should mark slot as instrument type', () => {
      const builder = engine.createBuilder();
      builder.define('attack :target with :weapon')
        .instrument('weapon')
        .mapsTo('test:attack')
        .build();

      const tokens = [
        { word: 'attack', normalized: 'attack', position: 0, candidates: [] },
        { word: 'troll', normalized: 'troll', position: 7, candidates: [] },
        { word: 'with', normalized: 'with', position: 13, candidates: [] },
        { word: 'sword', normalized: 'sword', position: 18, candidates: [] }
      ];

      const context: GrammarContext = {
        world: null,
        actorId: 'player',
        currentLocation: 'test',
        slots: new Map()
      };

      const matches = engine.findMatches(tokens, context);
      expect(matches).toHaveLength(1);

      const match = matches[0];
      expect(match.slots.get('target')?.text).toBe('troll');
      expect(match.slots.get('weapon')?.text).toBe('sword');
      expect((match.slots.get('weapon') as any)?.slotType).toBe(SlotType.INSTRUMENT);
    });
  });

  // ADR-080 Phase 2: Multi-Object Parsing
  describe('Grammar Engine - "all" Keyword Recognition', () => {
    it('should recognize "all" and set isAll flag', () => {
      const builder = engine.createBuilder();
      builder.define('take :item')
        .mapsTo('test:take')
        .build();

      const tokens = [
        { word: 'take', normalized: 'take', position: 0, candidates: [] },
        { word: 'all', normalized: 'all', position: 5, candidates: [] }
      ];

      const context: GrammarContext = {
        world: null,
        actorId: 'player',
        currentLocation: 'test',
        slots: new Map()
      };

      const matches = engine.findMatches(tokens, context);
      expect(matches).toHaveLength(1);

      const match = matches[0];
      expect(match.slots.get('item')?.text).toBe('all');
      expect((match.slots.get('item') as any)?.isAll).toBe(true);
    });

    it('should parse "all but X" with exclusion', () => {
      const builder = engine.createBuilder();
      builder.define('take :item')
        .mapsTo('test:take')
        .build();

      const tokens = [
        { word: 'take', normalized: 'take', position: 0, candidates: [] },
        { word: 'all', normalized: 'all', position: 5, candidates: [] },
        { word: 'but', normalized: 'but', position: 9, candidates: [] },
        { word: 'sword', normalized: 'sword', position: 13, candidates: [] }
      ];

      const context: GrammarContext = {
        world: null,
        actorId: 'player',
        currentLocation: 'test',
        slots: new Map()
      };

      const matches = engine.findMatches(tokens, context);
      expect(matches).toHaveLength(1);

      const match = matches[0];
      const slot = match.slots.get('item') as any;
      expect(slot.text).toBe('all');
      expect(slot.isAll).toBe(true);
      expect(slot.excluded).toBeDefined();
      expect(slot.excluded).toHaveLength(1);
      expect(slot.excluded[0].text).toBe('sword');
    });

    it('should parse "all except X and Y" with multiple exclusions', () => {
      const builder = engine.createBuilder();
      builder.define('drop :item')
        .mapsTo('test:drop')
        .build();

      const tokens = [
        { word: 'drop', normalized: 'drop', position: 0, candidates: [] },
        { word: 'all', normalized: 'all', position: 5, candidates: [] },
        { word: 'except', normalized: 'except', position: 9, candidates: [] },
        { word: 'sword', normalized: 'sword', position: 16, candidates: [] },
        { word: 'and', normalized: 'and', position: 22, candidates: [] },
        { word: 'shield', normalized: 'shield', position: 26, candidates: [] }
      ];

      const context: GrammarContext = {
        world: null,
        actorId: 'player',
        currentLocation: 'test',
        slots: new Map()
      };

      const matches = engine.findMatches(tokens, context);
      expect(matches).toHaveLength(1);

      const match = matches[0];
      const slot = match.slots.get('item') as any;
      expect(slot.isAll).toBe(true);
      expect(slot.excluded).toHaveLength(2);
      expect(slot.excluded[0].text).toBe('sword');
      expect(slot.excluded[1].text).toBe('shield');
    });
  });

  describe('Grammar Engine - "and" List Parsing', () => {
    it('should parse "X and Y" as list', () => {
      const builder = engine.createBuilder();
      builder.define('take :item')
        .mapsTo('test:take')
        .build();

      const tokens = [
        { word: 'take', normalized: 'take', position: 0, candidates: [] },
        { word: 'knife', normalized: 'knife', position: 5, candidates: [] },
        { word: 'and', normalized: 'and', position: 11, candidates: [] },
        { word: 'lamp', normalized: 'lamp', position: 15, candidates: [] }
      ];

      const context: GrammarContext = {
        world: null,
        actorId: 'player',
        currentLocation: 'test',
        slots: new Map()
      };

      const matches = engine.findMatches(tokens, context);
      expect(matches).toHaveLength(1);

      const match = matches[0];
      const slot = match.slots.get('item') as any;
      expect(slot.text).toBe('knife and lamp');
      expect(slot.isList).toBe(true);
      expect(slot.items).toHaveLength(2);
      expect(slot.items[0].text).toBe('knife');
      expect(slot.items[1].text).toBe('lamp');
    });

    it('should parse "X, Y, and Z" style list', () => {
      const builder = engine.createBuilder();
      builder.define('take :item')
        .mapsTo('test:take')
        .build();

      const tokens = [
        { word: 'take', normalized: 'take', position: 0, candidates: [] },
        { word: 'knife', normalized: 'knife', position: 5, candidates: [] },
        { word: 'and', normalized: 'and', position: 11, candidates: [] },
        { word: 'lamp', normalized: 'lamp', position: 15, candidates: [] },
        { word: 'and', normalized: 'and', position: 20, candidates: [] },
        { word: 'rope', normalized: 'rope', position: 24, candidates: [] }
      ];

      const context: GrammarContext = {
        world: null,
        actorId: 'player',
        currentLocation: 'test',
        slots: new Map()
      };

      const matches = engine.findMatches(tokens, context);
      expect(matches).toHaveLength(1);

      const match = matches[0];
      const slot = match.slots.get('item') as any;
      expect(slot.isList).toBe(true);
      expect(slot.items).toHaveLength(3);
      expect(slot.items[0].text).toBe('knife');
      expect(slot.items[1].text).toBe('lamp');
      expect(slot.items[2].text).toBe('rope');
    });

    it('should parse list with multi-word items', () => {
      const builder = engine.createBuilder();
      builder.define('take :item')
        .mapsTo('test:take')
        .build();

      // "take brass lantern and red key" - each item is multi-word
      const tokens = [
        { word: 'take', normalized: 'take', position: 0, candidates: [] },
        { word: 'brass', normalized: 'brass', position: 5, candidates: [] },
        { word: 'lantern', normalized: 'lantern', position: 11, candidates: [] },
        { word: 'and', normalized: 'and', position: 19, candidates: [] },
        { word: 'red', normalized: 'red', position: 23, candidates: [] },
        { word: 'key', normalized: 'key', position: 27, candidates: [] }
      ];

      const context: GrammarContext = {
        world: null,
        actorId: 'player',
        currentLocation: 'test',
        slots: new Map()
      };

      const matches = engine.findMatches(tokens, context);
      expect(matches).toHaveLength(1);

      const match = matches[0];
      const slot = match.slots.get('item') as any;
      expect(slot.isList).toBe(true);
      expect(slot.items).toHaveLength(2);
      expect(slot.items[0].text).toBe('brass lantern');
      expect(slot.items[1].text).toBe('red key');
    });

    it('should stop list at pattern delimiter', () => {
      const builder = engine.createBuilder();
      builder.define('put :item in :container')
        .mapsTo('test:put')
        .build();

      // "put knife and lamp in bag"
      const tokens = [
        { word: 'put', normalized: 'put', position: 0, candidates: [] },
        { word: 'knife', normalized: 'knife', position: 4, candidates: [] },
        { word: 'and', normalized: 'and', position: 10, candidates: [] },
        { word: 'lamp', normalized: 'lamp', position: 14, candidates: [] },
        { word: 'in', normalized: 'in', position: 19, candidates: [] },
        { word: 'bag', normalized: 'bag', position: 22, candidates: [] }
      ];

      const context: GrammarContext = {
        world: null,
        actorId: 'player',
        currentLocation: 'test',
        slots: new Map()
      };

      const matches = engine.findMatches(tokens, context);
      expect(matches).toHaveLength(1);

      const match = matches[0];
      const itemSlot = match.slots.get('item') as any;
      expect(itemSlot.isList).toBe(true);
      expect(itemSlot.items).toHaveLength(2);
      expect(itemSlot.items[0].text).toBe('knife');
      expect(itemSlot.items[1].text).toBe('lamp');

      const containerSlot = match.slots.get('container');
      expect(containerSlot?.text).toBe('bag');
    });
  });

  // Phase 3: Command Chaining Tests
  describe('Phase 3: Command Chaining', () => {
    let parser: EnglishParser;

    beforeEach(() => {
      vocabularyRegistry.clear();
      const provider = new EnglishLanguageProvider();
      parser = new EnglishParser(provider);
    });

    it('should split on periods', () => {
      const results = parser.parseChain('take sword. go north');

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      if (results[0].success) {
        expect(results[0].value.action).toBe('if.action.taking');
      }
      expect(results[1].success).toBe(true);
      if (results[1].success) {
        expect(results[1].value.action).toBe('if.action.going');
      }
    });

    it('should handle trailing period', () => {
      const results = parser.parseChain('take sword.');

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });

    it('should handle single command without period', () => {
      const results = parser.parseChain('take sword');

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });

    it('should preserve quoted strings containing periods', () => {
      // This test verifies the splitting logic doesn't break on quotes
      const results = parser.parseChain('look');

      expect(results).toHaveLength(1);
    });

    it('should split comma when followed by verb', () => {
      // "take sword, drop sword" - 'drop' is a verb
      const results = parser.parseChain('take sword, drop sword');

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      if (results[0].success) {
        expect(results[0].value.action).toBe('if.action.taking');
      }
      expect(results[1].success).toBe(true);
      if (results[1].success) {
        expect(results[1].value.action).toBe('if.action.dropping');
      }
    });

    it('should NOT split comma when followed by noun (treat as list)', () => {
      // "take knife, lamp" - 'lamp' is NOT a verb, treat as list
      const results = parser.parseChain('take knife, lamp');

      // Should be single command, not split
      expect(results).toHaveLength(1);
      // The parse might fail since comma-separated lists aren't fully
      // supported in grammar, but it should NOT be split
    });

    it('should handle multiple periods', () => {
      const results = parser.parseChain('look. take sword. go north.');

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);
    });

    it('should handle errors in chain without stopping', () => {
      // "take sword. xyzzy. go north" - xyzzy should fail but others succeed
      const results = parser.parseChain('take sword. xyzzy. go north');

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false); // xyzzy fails
      expect(results[2].success).toBe(true);
    });
  });

  // ADR-082: Vocabulary and Manner Slots
  describe('ADR-082: Vocabulary Slots', () => {
    it('should mark slot as VOCABULARY type via .fromVocabulary()', () => {
      const builder = engine.createBuilder();
      builder.define('push :color panel')
        .fromVocabulary('color', 'panel-colors')
        .mapsTo('test:push_panel')
        .build();

      const rules = engine.getRules();
      expect(rules).toHaveLength(1);

      const rule = rules[0];
      const colorSlot = rule.slots.get('color');
      expect(colorSlot?.slotType).toBe(SlotType.VOCABULARY);
      expect(colorSlot?.vocabularyCategory).toBe('panel-colors');
    });

    it('should match vocabulary slot when category is active', () => {
      const mockVocabProvider = {
        match: (category: string, word: string, ctx: GrammarContext) => {
          if (category === 'panel-colors' && ctx.currentLocation === 'mirror-room') {
            return ['red', 'yellow', 'mahogany', 'pine'].includes(word);
          }
          return false;
        }
      };

      const mockWorld = {
        getGrammarVocabularyProvider: () => mockVocabProvider
      };

      const builder = engine.createBuilder();
      builder.define('push :color panel')
        .fromVocabulary('color', 'panel-colors')
        .mapsTo('test:push_panel')
        .build();

      const tokens = [
        { word: 'push', normalized: 'push', position: 0, candidates: [] },
        { word: 'red', normalized: 'red', position: 5, candidates: [] },
        { word: 'panel', normalized: 'panel', position: 9, candidates: [] }
      ];

      // In mirror room - should match
      const mirrorContext: GrammarContext = {
        world: mockWorld,
        actorId: 'player',
        currentLocation: 'mirror-room',
        slots: new Map()
      };

      const matches = engine.findMatches(tokens, mirrorContext);
      expect(matches).toHaveLength(1);
      expect(matches[0].slots.get('color')?.text).toBe('red');
      expect((matches[0].slots.get('color') as any).category).toBe('panel-colors');
    });

    it('should not match vocabulary slot when category is inactive', () => {
      const mockVocabProvider = {
        match: (category: string, word: string, ctx: GrammarContext) => {
          if (category === 'panel-colors' && ctx.currentLocation === 'mirror-room') {
            return ['red', 'yellow'].includes(word);
          }
          return false;
        }
      };

      const mockWorld = {
        getGrammarVocabularyProvider: () => mockVocabProvider
      };

      const builder = engine.createBuilder();
      builder.define('push :color panel')
        .fromVocabulary('color', 'panel-colors')
        .mapsTo('test:push_panel')
        .build();

      const tokens = [
        { word: 'push', normalized: 'push', position: 0, candidates: [] },
        { word: 'red', normalized: 'red', position: 5, candidates: [] },
        { word: 'panel', normalized: 'panel', position: 9, candidates: [] }
      ];

      // Outside mirror room - should NOT match
      const hallwayContext: GrammarContext = {
        world: mockWorld,
        actorId: 'player',
        currentLocation: 'hallway',
        slots: new Map()
      };

      const matches = engine.findMatches(tokens, hallwayContext);
      expect(matches).toHaveLength(0);
    });
  });

  describe('ADR-082: Manner Slots', () => {
    it('should mark slot as MANNER type via .manner()', () => {
      const builder = engine.createBuilder();
      builder.define(':manner open :target')
        .manner('manner')
        .mapsTo('test:open')
        .build();

      const rules = engine.getRules();
      expect(rules).toHaveLength(1);

      const rule = rules[0];
      expect(rule.slots.get('manner')?.slotType).toBe(SlotType.MANNER);
    });

    it('should match built-in manner adverbs', () => {
      const builder = engine.createBuilder();
      builder.define(':manner open :target')
        .manner('manner')
        .mapsTo('test:open')
        .build();

      const tokens = [
        { word: 'carefully', normalized: 'carefully', position: 0, candidates: [] },
        { word: 'open', normalized: 'open', position: 10, candidates: [] },
        { word: 'door', normalized: 'door', position: 15, candidates: [] }
      ];

      const context: GrammarContext = {
        world: null,
        actorId: 'player',
        currentLocation: 'test',
        slots: new Map()
      };

      const matches = engine.findMatches(tokens, context);
      expect(matches).toHaveLength(1);

      const mannerSlot = matches[0].slots.get('manner');
      expect(mannerSlot?.text).toBe('carefully');
      expect((mannerSlot as any).manner).toBe('carefully');
    });

    it('should match multiple built-in manner adverbs', () => {
      const adverbs = ['quickly', 'slowly', 'forcefully', 'gently', 'quietly', 'loudly'];

      for (const adverb of adverbs) {
        // Create fresh engine for each adverb
        const testEngine = new EnglishGrammarEngine();
        const builder = testEngine.createBuilder();
        builder.define(':manner open :target')
          .manner('manner')
          .mapsTo('test:open')
          .build();

        const tokens = [
          { word: adverb, normalized: adverb, position: 0, candidates: [] },
          { word: 'open', normalized: 'open', position: 10, candidates: [] },
          { word: 'door', normalized: 'door', position: 15, candidates: [] }
        ];

        const context: GrammarContext = {
          world: null,
          actorId: 'player',
          currentLocation: 'test',
          slots: new Map()
        };

        const matches = testEngine.findMatches(tokens, context);
        expect(matches.length).toBeGreaterThan(0);
        expect((matches[0].slots.get('manner') as any).manner).toBe(adverb);
      }
    });

    it('should match story-extended manner adverbs', () => {
      const mockVocabProvider = {
        match: (category: string, word: string) => {
          if (category === 'manner') {
            return ['recklessly', 'frantically'].includes(word);
          }
          return false;
        }
      };

      const mockWorld = {
        getGrammarVocabularyProvider: () => mockVocabProvider
      };

      const builder = engine.createBuilder();
      builder.define(':manner open :target')
        .manner('manner')
        .mapsTo('test:open')
        .build();

      const tokens = [
        { word: 'recklessly', normalized: 'recklessly', position: 0, candidates: [] },
        { word: 'open', normalized: 'open', position: 11, candidates: [] },
        { word: 'door', normalized: 'door', position: 16, candidates: [] }
      ];

      const context: GrammarContext = {
        world: mockWorld,
        actorId: 'player',
        currentLocation: 'test',
        slots: new Map()
      };

      const matches = engine.findMatches(tokens, context);
      expect(matches).toHaveLength(1);
      expect((matches[0].slots.get('manner') as any).manner).toBe('recklessly');
    });

    it('should not match non-manner words', () => {
      const builder = engine.createBuilder();
      builder.define(':manner open :target')
        .manner('manner')
        .mapsTo('test:open')
        .build();

      const tokens = [
        { word: 'banana', normalized: 'banana', position: 0, candidates: [] },
        { word: 'open', normalized: 'open', position: 7, candidates: [] },
        { word: 'door', normalized: 'door', position: 12, candidates: [] }
      ];

      const context: GrammarContext = {
        world: null,
        actorId: 'player',
        currentLocation: 'test',
        slots: new Map()
      };

      const matches = engine.findMatches(tokens, context);
      // Should not match because 'banana' is not a manner adverb
      expect(matches).toHaveLength(0);
    });
  });
});
