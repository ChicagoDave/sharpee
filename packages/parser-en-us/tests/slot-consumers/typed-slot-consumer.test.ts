/**
 * @file Typed Slot Consumer Tests
 * @description Unit tests for the typed slot consumer (ADR-088). A typed
 * slot has one reading, the token its vocabulary reads (ADR-386 D1).
 */

import { describe, it, expect } from 'vitest';
import { SlotType, type SlotMatch } from '@sharpee/if-domain';
import { TypedSlotConsumer, SlotConsumerContext, isSlotReadings } from '../../src/slot-consumers';

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
      context: { world: undefined as unknown },
      slotType
    } as unknown as SlotConsumerContext;
  }

  /** The slot's one reading, or null. */
  const one = (ctx: SlotConsumerContext): SlotMatch | null => {
    const result = consumer.consume(ctx);
    if (!result || !isSlotReadings(result)) return null;
    expect(result.readings).toHaveLength(1);
    return result.readings[0];
  };

  describe('NUMBER slot', () => {
    it('should match digit numbers', () => {
      const result = one(createContext(SlotType.NUMBER, '42'));
      expect(result).not.toBeNull();
      expect(result!.text).toBe('42');
      expect(result!.slotType).toBe(SlotType.NUMBER);
    });

    it('should match number words', () => {
      const result = one(createContext(SlotType.NUMBER, 'five'));
      expect(result).not.toBeNull();
      expect(result!.text).toBe('five');
    });

    it('should not match non-numbers', () => {
      expect(one(createContext(SlotType.NUMBER, 'hello'))).toBeNull();
    });
  });

  describe('ORDINAL slot', () => {
    it('should match ordinal words', () => {
      const result = one(createContext(SlotType.ORDINAL, 'first'));
      expect(result).not.toBeNull();
      expect(result!.text).toBe('first');
      expect(result!.slotType).toBe(SlotType.ORDINAL);
    });

    it('should match suffixed ordinals', () => {
      const tests = ['1st', '2nd', '3rd', '4th', '21st', '22nd', '23rd'];
      for (const ordinal of tests) {
        const result = one(createContext(SlotType.ORDINAL, ordinal));
        expect(result).not.toBeNull();
        expect(result!.text).toBe(ordinal);
      }
    });

    it('should not match non-ordinals', () => {
      expect(one(createContext(SlotType.ORDINAL, 'hello'))).toBeNull();
    });
  });

  describe('TIME slot', () => {
    it('should match valid time formats', () => {
      const times = ['10:40', '6:00', '23:59', '0:00'];
      for (const time of times) {
        const result = one(createContext(SlotType.TIME, time));
        expect(result).not.toBeNull();
        expect(result!.text).toBe(time);
        expect(result!.slotType).toBe(SlotType.TIME);
      }
    });

    it('should not match invalid time formats', () => {
      const invalid = ['25:00', '12:60', '10-40', 'noon', '12'];
      for (const time of invalid) {
        expect(one(createContext(SlotType.TIME, time))).toBeNull();
      }
    });
  });

  describe('DIRECTION slot', () => {
    it('should match cardinal directions', () => {
      const directions = ['north', 'south', 'east', 'west'];
      for (const dir of directions) {
        const result = one(createContext(SlotType.DIRECTION, dir));
        expect(result).not.toBeNull();
        expect(result!.slotType).toBe(SlotType.DIRECTION);
      }
    });

    it('should match abbreviated directions', () => {
      const directions = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
      for (const dir of directions) {
        expect(one(createContext(SlotType.DIRECTION, dir))).not.toBeNull();
      }
    });

    it('should match up/down', () => {
      const directions = ['up', 'down', 'u', 'd'];
      for (const dir of directions) {
        expect(one(createContext(SlotType.DIRECTION, dir))).not.toBeNull();
      }
    });

    it('should not match non-directions', () => {
      expect(one(createContext(SlotType.DIRECTION, 'forward'))).toBeNull();
    });
  });
});
