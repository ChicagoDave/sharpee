/**
 * @file Text Slot Consumer Tests
 * @description Unit tests for the text slot consumer (ADR-088)
 */

import { describe, it, expect } from 'vitest';
import { SlotType } from '@sharpee/if-domain';
import { TextSlotConsumer, SlotConsumerContext } from '../../src/slot-consumers';

describe('TextSlotConsumer', () => {
  const consumer = new TextSlotConsumer();

  function createContext(
    slotType: SlotType,
    words: string[],
    startIndex = 0,
    nextPatternValue?: string
  ): SlotConsumerContext {
    const tokens = words.map((word, i) => ({
      word,
      normalized: word.toLowerCase(),
      position: i * 5,
      candidates: []
    }));

    const patternTokens = [
      { type: 'slot' as const, value: 'target', slotType }
    ];

    // Add next pattern token if provided (for greedy/topic tests)
    if (nextPatternValue) {
      patternTokens.push({ type: 'literal' as const, value: nextPatternValue, slotType: undefined as any });
    }

    return {
      slotName: 'target',
      tokens,
      startIndex,
      pattern: { tokens: patternTokens, minTokens: 1, slots: ['target'] },
      slotTokenIndex: 0,
      rule: { slots: new Map() },
      context: { world: undefined as any },
      slotType
    };
  }

  describe('TEXT slot', () => {
    it('should consume single token', () => {
      const ctx = createContext(SlotType.TEXT, ['hello']);
      const result = consumer.consume(ctx);

      expect(result).not.toBeNull();
      expect(result!.text).toBe('hello');
      expect(result!.tokens).toEqual([0]);
      expect(result!.slotType).toBe(SlotType.TEXT);
    });

    it('should return null for empty tokens', () => {
      const ctx = createContext(SlotType.TEXT, [], 0);
      const result = consumer.consume(ctx);
      expect(result).toBeNull();
    });

    it('should return null when start index is out of bounds', () => {
      const ctx = createContext(SlotType.TEXT, ['hello'], 5);
      const result = consumer.consume(ctx);
      expect(result).toBeNull();
    });
  });

  describe('TEXT_GREEDY slot', () => {
    it('should consume all tokens to end', () => {
      const ctx = createContext(SlotType.TEXT_GREEDY, ['hello', 'world']);
      const result = consumer.consume(ctx);

      expect(result).not.toBeNull();
      expect(result!.text).toBe('hello world');
      expect(result!.tokens).toEqual([0, 1]);
    });

    it('should stop at pattern delimiter', () => {
      const ctx = createContext(SlotType.TEXT_GREEDY, ['hello', 'world', 'to'], 0, 'to');
      const result = consumer.consume(ctx);

      expect(result).not.toBeNull();
      expect(result!.text).toBe('hello world');
      expect(result!.tokens).toEqual([0, 1]);
    });
  });

  describe('QUOTED_TEXT slot', () => {
    it('should consume single-token quoted text', () => {
      const ctx = createContext(SlotType.QUOTED_TEXT, ['"hello"']);
      const result = consumer.consume(ctx);

      expect(result).not.toBeNull();
      expect(result!.text).toBe('hello');
    });

    it('should consume multi-token quoted text', () => {
      const ctx = createContext(SlotType.QUOTED_TEXT, ['"hello', 'world"']);
      const result = consumer.consume(ctx);

      expect(result).not.toBeNull();
      expect(result!.text).toBe('hello world');
      expect(result!.tokens).toEqual([0, 1]);
    });

    it('should return null for unquoted text', () => {
      const ctx = createContext(SlotType.QUOTED_TEXT, ['hello']);
      const result = consumer.consume(ctx);
      expect(result).toBeNull();
    });

    it('should return null for unclosed quote', () => {
      const ctx = createContext(SlotType.QUOTED_TEXT, ['"hello', 'world']);
      const result = consumer.consume(ctx);
      expect(result).toBeNull();
    });
  });

  describe('TOPIC slot', () => {
    it('should consume tokens until delimiter', () => {
      const ctx = createContext(SlotType.TOPIC, ['weather', 'report', 'to'], 0, 'to');
      const result = consumer.consume(ctx);

      expect(result).not.toBeNull();
      expect(result!.text).toBe('weather report');
      expect(result!.tokens).toEqual([0, 1]);
    });

    it('should consume all tokens if no delimiter', () => {
      const ctx = createContext(SlotType.TOPIC, ['weather', 'report']);
      const result = consumer.consume(ctx);

      expect(result).not.toBeNull();
      expect(result!.text).toBe('weather report');
    });
  });
});
