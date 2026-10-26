/**
 * @file Text Slot Consumer Tests
 * @description Unit tests for the text slot consumer (ADR-088). A consumer
 * returns its readings (ADR-386 D1): a single-token or quoted slot has one, a
 * greedy or topic slot has every extent to the end of the input, longest
 * first; the engine, not the consumer, decides where the slot ends.
 */

import { describe, it, expect } from 'vitest';
import { SlotType } from '@sharpee/if-domain';
import { TextSlotConsumer, SlotConsumerContext, isSlotReadings, phraseWordsOf } from '../../src/slot-consumers';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';

describe('TextSlotConsumer', () => {
  const consumer = new TextSlotConsumer();

  function createContext(slotType: SlotType, words: string[], startIndex = 0): SlotConsumerContext {
    const tokens = words.map((word, i) => ({
      word,
      normalized: word.toLowerCase(),
      position: i * 5,
      candidates: []
    }));
    return {
      slotName: 'target',
      tokens,
      startIndex,
      pattern: { tokens: [{ type: 'slot' as const, value: 'target', slotType }], minTokens: 1, slots: ['target'] },
      slotTokenIndex: 0,
      rule: { slots: new Map() },
      context: { world: undefined as unknown },
      language: new EnglishLanguageProvider(),
      words: phraseWordsOf(new EnglishLanguageProvider()),
      slotType
    } as unknown as SlotConsumerContext;
  }

  const readings = (ctx: SlotConsumerContext) => {
    const result = consumer.consume(ctx);
    return result && isSlotReadings(result) ? result.readings : null;
  };

  describe('TEXT slot', () => {
    it('reads one token as its one reading', () => {
      const r = readings(createContext(SlotType.TEXT, ['hello']));
      expect(r).not.toBeNull();
      expect(r).toHaveLength(1);
      expect(r![0].text).toBe('hello');
      expect(r![0].tokens).toEqual([0]);
      expect(r![0].slotType).toBe(SlotType.TEXT);
    });

    it('returns null for empty tokens', () => {
      expect(consumer.consume(createContext(SlotType.TEXT, [], 0))).toBeNull();
    });

    it('returns null when start index is out of bounds', () => {
      expect(consumer.consume(createContext(SlotType.TEXT, ['hello'], 5))).toBeNull();
    });
  });

  describe('TEXT_GREEDY slot', () => {
    it('reads every extent to the end, longest first', () => {
      const r = readings(createContext(SlotType.TEXT_GREEDY, ['hello', 'world', 'to']));
      expect(r!.map((m) => m.tokens)).toEqual([[0, 1, 2], [0, 1], [0]]);
      expect(r![0].text).toBe('hello world to');
      expect(r![1].text).toBe('hello world');
    });
  });

  describe('QUOTED_TEXT slot', () => {
    it('reads single-token quoted text', () => {
      const r = readings(createContext(SlotType.QUOTED_TEXT, ['"hello"']));
      expect(r).toHaveLength(1);
      expect(r![0].text).toBe('hello');
    });

    it('reads multi-token quoted text as one reading', () => {
      const r = readings(createContext(SlotType.QUOTED_TEXT, ['"hello', 'world"']));
      expect(r).toHaveLength(1);
      expect(r![0].text).toBe('hello world');
      expect(r![0].tokens).toEqual([0, 1]);
    });

    it('returns null for unquoted text', () => {
      expect(consumer.consume(createContext(SlotType.QUOTED_TEXT, ['hello']))).toBeNull();
    });

    it('returns null for an unclosed quote', () => {
      expect(consumer.consume(createContext(SlotType.QUOTED_TEXT, ['"hello', 'world']))).toBeNull();
    });
  });

  describe('TOPIC slot', () => {
    it('reads every extent, longest first, each with its leading words split', () => {
      const r = readings(createContext(SlotType.TOPIC, ['weather', 'report', 'to']));
      expect(r!.map((m) => m.tokens)).toEqual([[0, 1, 2], [0, 1], [0]]);
      expect(r![1].text).toBe('weather report');
      expect(r![1].slotType).toBe(SlotType.TOPIC);
      expect(r![1].articles).toEqual([]);
    });

    it('reads the whole input as its first reading', () => {
      const r = readings(createContext(SlotType.TOPIC, ['weather', 'report']));
      expect(r![0].text).toBe('weather report');
    });
  });
});
