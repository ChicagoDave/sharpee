/**
 * @file Slot Consumer Registry Tests
 * @description Unit tests for the slot consumer registry (ADR-088)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SlotType, SlotMatch } from '@sharpee/if-domain';
import {
  SlotConsumerRegistry,
  createDefaultRegistry,
  SlotConsumer,
  SlotConsumerContext
} from '../../src/slot-consumers';

describe('SlotConsumerRegistry', () => {
  describe('Basic Registry Operations', () => {
    it('should start empty', () => {
      const registry = new SlotConsumerRegistry();
      expect(registry.getRegisteredTypes()).toHaveLength(0);
    });

    it('should register a consumer for its declared slot types', () => {
      const registry = new SlotConsumerRegistry();
      const mockConsumer: SlotConsumer = {
        slotTypes: [SlotType.TEXT, SlotType.TOPIC],
        consume: () => null
      };

      registry.register(mockConsumer);

      expect(registry.hasConsumer(SlotType.TEXT)).toBe(true);
      expect(registry.hasConsumer(SlotType.TOPIC)).toBe(true);
      expect(registry.hasConsumer(SlotType.NUMBER)).toBe(false);
    });

    it('should throw when consuming with unregistered slot type', () => {
      const registry = new SlotConsumerRegistry();
      const ctx: SlotConsumerContext = {
        slotName: 'test',
        tokens: [],
        startIndex: 0,
        pattern: { tokens: [], minTokens: 0, slots: [] },
        slotTokenIndex: 0,
        rule: { slots: new Map() },
        context: { world: undefined as any },
        slotType: SlotType.NUMBER
      };

      expect(() => registry.consume(ctx)).toThrow('No consumer registered for slot type:');
    });

    it('should delegate to registered consumer', () => {
      const registry = new SlotConsumerRegistry();
      const expectedResult: SlotMatch = {
        tokens: [0],
        text: 'test',
        confidence: 1.0,
        slotType: SlotType.TEXT
      };

      const mockConsumer: SlotConsumer = {
        slotTypes: [SlotType.TEXT],
        consume: () => expectedResult
      };

      registry.register(mockConsumer);

      const ctx: SlotConsumerContext = {
        slotName: 'test',
        tokens: [{ word: 'test', normalized: 'test', position: 0, candidates: [] }],
        startIndex: 0,
        pattern: { tokens: [], minTokens: 0, slots: [] },
        slotTokenIndex: 0,
        rule: { slots: new Map() },
        context: { world: undefined as any },
        slotType: SlotType.TEXT
      };

      const result = registry.consume(ctx);
      expect(result).toBe(expectedResult);
    });
  });

  describe('Default Registry', () => {
    it('should have all slot types registered', () => {
      const registry = createDefaultRegistry();

      // Entity types
      expect(registry.hasConsumer(SlotType.ENTITY)).toBe(true);
      expect(registry.hasConsumer(SlotType.INSTRUMENT)).toBe(true);

      // Text types
      expect(registry.hasConsumer(SlotType.TEXT)).toBe(true);
      expect(registry.hasConsumer(SlotType.TEXT_GREEDY)).toBe(true);
      expect(registry.hasConsumer(SlotType.QUOTED_TEXT)).toBe(true);
      expect(registry.hasConsumer(SlotType.TOPIC)).toBe(true);

      // Typed value types
      expect(registry.hasConsumer(SlotType.NUMBER)).toBe(true);
      expect(registry.hasConsumer(SlotType.ORDINAL)).toBe(true);
      expect(registry.hasConsumer(SlotType.TIME)).toBe(true);
      expect(registry.hasConsumer(SlotType.DIRECTION)).toBe(true);

      // Vocabulary types
      expect(registry.hasConsumer(SlotType.ADJECTIVE)).toBe(true);
      expect(registry.hasConsumer(SlotType.NOUN)).toBe(true);
      expect(registry.hasConsumer(SlotType.VOCABULARY)).toBe(true);
      expect(registry.hasConsumer(SlotType.MANNER)).toBe(true);
    });

    it('should return all registered types', () => {
      const registry = createDefaultRegistry();
      const types = registry.getRegisteredTypes();

      expect(types.length).toBeGreaterThanOrEqual(14);
      expect(types).toContain(SlotType.ENTITY);
      expect(types).toContain(SlotType.TEXT);
      expect(types).toContain(SlotType.NUMBER);
      expect(types).toContain(SlotType.MANNER);
    });
  });
});
