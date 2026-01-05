/**
 * @file Typed Slot Consumer Tests
 * @description Unit tests for the typed slot consumer (ADR-088)
 */

import { describe, it, expect } from 'vitest';
import { SlotType } from '@sharpee/if-domain';
import { TypedSlotConsumer, SlotConsumerContext } from '../../src/slot-consumers';

describe('TypedSlotConsumer', () => {
  const consumer = new TypedSlotConsumer();

  function createContext(slotType: SlotType, word: string): SlotConsumerContext {
    return {
      slotName: 'value',
      tokens: [{ word, normalized: word.toLowerCase(), position: 0, candidates: [] }],
      startIndex: 0,
      pattern: { tokens: [], minTokens: 1, slots: ['value'] },
      slotTokenIndex: 0,
      rule: { slots: new Map() },
      context: { world: undefined as any },
      slotType
    };
  }

  describe('NUMBER slot', () => {
    it('should match digit numbers', () => {
      const ctx = createContext(SlotType.NUMBER, '42');
      const result = consumer.consume(ctx);

      expect(result).not.toBeNull();
      expect(result!.text).toBe('42');
      expect(result!.slotType).toBe(SlotType.NUMBER);
    });

    it('should match number words', () => {
      const ctx = createContext(SlotType.NUMBER, 'five');
      const result = consumer.consume(ctx);

      expect(result).not.toBeNull();
      expect(result!.text).toBe('five');
    });

    it('should not match non-numbers', () => {
      const ctx = createContext(SlotType.NUMBER, 'hello');
      const result = consumer.consume(ctx);
      expect(result).toBeNull();
    });
  });

  describe('ORDINAL slot', () => {
    it('should match ordinal words', () => {
      const ctx = createContext(SlotType.ORDINAL, 'first');
      const result = consumer.consume(ctx);

      expect(result).not.toBeNull();
      expect(result!.text).toBe('first');
      expect(result!.slotType).toBe(SlotType.ORDINAL);
    });

    it('should match suffixed ordinals', () => {
      const tests = ['1st', '2nd', '3rd', '4th', '21st', '22nd', '23rd'];
      for (const ordinal of tests) {
        const ctx = createContext(SlotType.ORDINAL, ordinal);
        const result = consumer.consume(ctx);
        expect(result).not.toBeNull();
        expect(result!.text).toBe(ordinal);
      }
    });

    it('should not match non-ordinals', () => {
      const ctx = createContext(SlotType.ORDINAL, 'hello');
      const result = consumer.consume(ctx);
      expect(result).toBeNull();
    });
  });

  describe('TIME slot', () => {
    it('should match valid time formats', () => {
      const times = ['10:40', '6:00', '23:59', '0:00'];
      for (const time of times) {
        const ctx = createContext(SlotType.TIME, time);
        const result = consumer.consume(ctx);
        expect(result).not.toBeNull();
        expect(result!.text).toBe(time);
        expect(result!.slotType).toBe(SlotType.TIME);
      }
    });

    it('should not match invalid time formats', () => {
      const invalid = ['25:00', '12:60', '10-40', 'noon', '12'];
      for (const time of invalid) {
        const ctx = createContext(SlotType.TIME, time);
        const result = consumer.consume(ctx);
        expect(result).toBeNull();
      }
    });
  });

  describe('DIRECTION slot', () => {
    it('should match cardinal directions', () => {
      const directions = ['north', 'south', 'east', 'west'];
      for (const dir of directions) {
        const ctx = createContext(SlotType.DIRECTION, dir);
        const result = consumer.consume(ctx);
        expect(result).not.toBeNull();
        expect(result!.slotType).toBe(SlotType.DIRECTION);
      }
    });

    it('should match abbreviated directions', () => {
      const directions = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
      for (const dir of directions) {
        const ctx = createContext(SlotType.DIRECTION, dir);
        const result = consumer.consume(ctx);
        expect(result).not.toBeNull();
      }
    });

    it('should match up/down', () => {
      const directions = ['up', 'down', 'u', 'd'];
      for (const dir of directions) {
        const ctx = createContext(SlotType.DIRECTION, dir);
        const result = consumer.consume(ctx);
        expect(result).not.toBeNull();
      }
    });

    it('should not match non-directions', () => {
      const ctx = createContext(SlotType.DIRECTION, 'forward');
      const result = consumer.consume(ctx);
      expect(result).toBeNull();
    });
  });
});
