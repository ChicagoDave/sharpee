/**
 * @file ADR-082 Typed Slots Tests
 * @description Tests for the extended grammar slot types from ADR-082
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishGrammarEngine } from '../src/english-grammar-engine';
import { Token, SlotType } from '@sharpee/if-domain';

describe('ADR-082: Typed Slots', () => {
  let engine: EnglishGrammarEngine;
  let grammar: any;

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

  describe('NUMBER slot', () => {
    it('should match digit numbers', () => {
      grammar
        .define('turn dial to :n')
        .number('n')
        .mapsTo('set_dial')
        .build();

      const tokens = createTokens(['turn', 'dial', 'to', '29']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);

      expect(matches).toHaveLength(1);
      expect(matches[0].rule.action).toBe('set_dial');

      const nSlot = matches[0].slots.get('n');
      expect(nSlot?.text).toBe('29');
      expect(nSlot?.slotType).toBe(SlotType.NUMBER);
    });

    it('should match number words', () => {
      grammar
        .define('wait :n')
        .number('n')
        .mapsTo('wait_turns')
        .build();

      const tokens = createTokens(['wait', 'five']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);

      expect(matches).toHaveLength(1);
      expect(matches[0].rule.action).toBe('wait_turns');

      const nSlot = matches[0].slots.get('n');
      expect(nSlot?.text).toBe('five');
      expect(nSlot?.slotType).toBe(SlotType.NUMBER);
    });

    it('should not match non-numbers', () => {
      grammar
        .define('wait :n')
        .number('n')
        .mapsTo('wait_turns')
        .build();

      const tokens = createTokens(['wait', 'forever']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);

      expect(matches).toHaveLength(0);
    });

    it('should extract numeric value from digit', () => {
      grammar
        .define('set slider to :n')
        .number('n')
        .mapsTo('set_slider')
        .build();

      const tokens = createTokens(['set', 'slider', 'to', '414']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);

      const nSlot = matches[0].slots.get('n');
      const value = EnglishGrammarEngine.extractNumberValue(nSlot!);
      expect(value).toBe(414);
    });

    it('should extract numeric value from word', () => {
      grammar
        .define('wait :n')
        .number('n')
        .mapsTo('wait_turns')
        .build();

      const tokens = createTokens(['wait', 'twenty']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);

      const nSlot = matches[0].slots.get('n');
      const value = EnglishGrammarEngine.extractNumberValue(nSlot!);
      expect(value).toBe(20);
    });
  });

  describe('ORDINAL slot', () => {
    it('should match ordinal words', () => {
      grammar
        .define('take :ord key')
        .ordinal('ord')
        .mapsTo('take_nth')
        .build();

      const tokens = createTokens(['take', 'first', 'key']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);

      expect(matches).toHaveLength(1);
      expect(matches[0].rule.action).toBe('take_nth');

      const ordSlot = matches[0].slots.get('ord');
      expect(ordSlot?.text).toBe('first');
      expect(ordSlot?.slotType).toBe(SlotType.ORDINAL);
    });

    it('should match suffixed ordinals (1st, 2nd, 3rd)', () => {
      grammar
        .define('push :ord button')
        .ordinal('ord')
        .mapsTo('push_nth_button')
        .build();

      for (const [ordinal, expected] of [['1st', 1], ['2nd', 2], ['3rd', 3], ['4th', 4], ['21st', 21]]) {
        const tokens = createTokens(['push', ordinal as string, 'button']);
        const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
        const matches = engine.findMatches(tokens, context);

        expect(matches).toHaveLength(1);

        const ordSlot = matches[0].slots.get('ord');
        const value = EnglishGrammarEngine.extractOrdinalValue(ordSlot!);
        expect(value).toBe(expected);
      }
    });

    it('should extract ordinal value from word', () => {
      grammar
        .define('go to :ord floor')
        .ordinal('ord')
        .mapsTo('go_floor')
        .build();

      const tokens = createTokens(['go', 'to', 'fifth', 'floor']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);

      const ordSlot = matches[0].slots.get('ord');
      const value = EnglishGrammarEngine.extractOrdinalValue(ordSlot!);
      expect(value).toBe(5);
    });
  });

  describe('TIME slot', () => {
    it('should match time in HH:MM format', () => {
      grammar
        .define('wait until :t')
        .time('t')
        .mapsTo('wait_until')
        .build();

      const tokens = createTokens(['wait', 'until', '10:40']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);

      expect(matches).toHaveLength(1);
      expect(matches[0].rule.action).toBe('wait_until');

      const tSlot = matches[0].slots.get('t');
      expect(tSlot?.text).toBe('10:40');
      expect(tSlot?.slotType).toBe(SlotType.TIME);
    });

    it('should extract time components', () => {
      grammar
        .define('set alarm to :t')
        .time('t')
        .mapsTo('set_alarm')
        .build();

      const tokens = createTokens(['set', 'alarm', 'to', '6:30']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);

      const tSlot = matches[0].slots.get('t');
      const time = EnglishGrammarEngine.extractTimeValue(tSlot!);
      expect(time).toEqual({ hours: 6, minutes: 30 });
    });

    it('should not match invalid time formats', () => {
      grammar
        .define('wait until :t')
        .time('t')
        .mapsTo('wait_until')
        .build();

      const tokens = createTokens(['wait', 'until', 'noon']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);

      expect(matches).toHaveLength(0);
    });
  });

  describe('DIRECTION slot', () => {
    it('should match cardinal directions', () => {
      grammar
        .define('push :entity :dir')
        .direction('dir')
        .mapsTo('push_direction')
        .build();

      for (const dir of ['north', 'south', 'east', 'west']) {
        const tokens = createTokens(['push', 'boulder', dir]);
        const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
        const matches = engine.findMatches(tokens, context);

        expect(matches).toHaveLength(1);
        expect(matches[0].rule.action).toBe('push_direction');

        const dirSlot = matches[0].slots.get('dir');
        expect(dirSlot?.slotType).toBe(SlotType.DIRECTION);
      }
    });

    it('should match abbreviated directions', () => {
      grammar
        .define('pace :n :dir')
        .number('n')
        .direction('dir')
        .mapsTo('pace')
        .build();

      const tokens = createTokens(['pace', '5', 'n']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);

      expect(matches).toHaveLength(1);

      const dirSlot = matches[0].slots.get('dir');
      const canonical = EnglishGrammarEngine.extractDirectionValue(dirSlot!);
      expect(canonical).toBe('north');
    });

    it('should match ordinal directions (ne, sw, etc.)', () => {
      grammar
        .define('go :dir')
        .direction('dir')
        .mapsTo('go')
        .build();

      for (const [abbrev, full] of [['ne', 'northeast'], ['sw', 'southwest']]) {
        const tokens = createTokens(['go', abbrev]);
        const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
        const matches = engine.findMatches(tokens, context);

        expect(matches).toHaveLength(1);

        const dirSlot = matches[0].slots.get('dir');
        const canonical = EnglishGrammarEngine.extractDirectionValue(dirSlot!);
        expect(canonical).toBe(full);
      }
    });

    it('should match up/down directions', () => {
      grammar
        .define('go :dir')
        .direction('dir')
        .mapsTo('go')
        .build();

      for (const [dir, canonical] of [['up', 'up'], ['down', 'down'], ['u', 'up'], ['d', 'down']]) {
        const tokens = createTokens(['go', dir]);
        const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
        const matches = engine.findMatches(tokens, context);

        expect(matches).toHaveLength(1);

        const dirSlot = matches[0].slots.get('dir');
        const result = EnglishGrammarEngine.extractDirectionValue(dirSlot!);
        expect(result).toBe(canonical);
      }
    });
  });

  describe('QUOTED_TEXT slot', () => {
    it('should match single-token quoted text', () => {
      grammar
        .define('say :msg')
        .quotedText('msg')
        .mapsTo('speak')
        .build();

      // Note: In real parser, tokenizer would keep "hello" as single token
      const tokens: Token[] = [{
        word: '"hello"',
        normalized: '"hello"',
        position: 4,
        candidates: []
      }];
      tokens.unshift({
        word: 'say',
        normalized: 'say',
        position: 0,
        candidates: []
      });

      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);

      expect(matches).toHaveLength(1);
      expect(matches[0].rule.action).toBe('speak');

      const msgSlot = matches[0].slots.get('msg');
      expect(msgSlot?.text).toBe('hello');
      expect(msgSlot?.slotType).toBe(SlotType.QUOTED_TEXT);
    });
  });

  describe('TOPIC slot', () => {
    it('should consume words until pattern delimiter', () => {
      grammar
        .define('ask :entity about :topic with :instrument')
        .topic('topic')
        .mapsTo('ask_about')
        .build();

      const tokens = createTokens(['ask', 'wizard', 'about', 'the', 'ancient', 'curse', 'with', 'scroll']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);

      expect(matches).toHaveLength(1);
      expect(matches[0].rule.action).toBe('ask_about');

      const topicSlot = matches[0].slots.get('topic');
      expect(topicSlot?.text).toBe('the ancient curse');
      expect(topicSlot?.slotType).toBe(SlotType.TOPIC);
    });

    it('should consume to end if no delimiter', () => {
      grammar
        .define('recall :topic')
        .topic('topic')
        .mapsTo('recall')
        .build();

      const tokens = createTokens(['recall', 'fire', 'resistance', 'ritual']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);

      expect(matches).toHaveLength(1);

      const topicSlot = matches[0].slots.get('topic');
      expect(topicSlot?.text).toBe('fire resistance ritual');
    });
  });

  describe('Combined typed slots', () => {
    it('should handle multiple typed slots in one pattern', () => {
      grammar
        .define('pace :n :dir')
        .number('n')
        .direction('dir')
        .mapsTo('pace')
        .build();

      const tokens = createTokens(['pace', '5', 'north']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);

      expect(matches).toHaveLength(1);

      const nSlot = matches[0].slots.get('n');
      expect(EnglishGrammarEngine.extractNumberValue(nSlot!)).toBe(5);

      const dirSlot = matches[0].slots.get('dir');
      expect(EnglishGrammarEngine.extractDirectionValue(dirSlot!)).toBe('north');
    });

    it('should handle ordinal with entity pattern', () => {
      grammar
        .define('take :ord :item')
        .ordinal('ord')
        .mapsTo('take_nth')
        .build();

      const tokens = createTokens(['take', 'second', 'key']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);

      expect(matches).toHaveLength(1);

      const ordSlot = matches[0].slots.get('ord');
      expect(EnglishGrammarEngine.extractOrdinalValue(ordSlot!)).toBe(2);

      const itemSlot = matches[0].slots.get('item');
      expect(itemSlot?.text).toBe('key');
    });
  });
});
