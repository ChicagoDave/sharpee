/**
 * @file ADR-080 Grammar Enhancements Tests
 * @description Tests for text slots, greedy text slots, and instrument slots
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishPatternCompiler } from '../src/english-pattern-compiler';
import { EnglishGrammarEngine } from '../src/english-grammar-engine';
import { SlotType, GrammarContext } from '@sharpee/if-domain';

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
});
