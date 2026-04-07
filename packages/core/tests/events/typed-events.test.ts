/**
 * Typed Event System Tests
 *
 * Tests the type-safe event creation API (ADR-082):
 * event factory, message events, empty events, and counter reset.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTypedEvent,
  createMessageEvent,
  createEmptyEvent,
  resetEventCounter
} from '../../src/events/event-factory';

describe('Typed Event System', () => {
  beforeEach(() => {
    resetEventCounter();
  });

  describe('createTypedEvent', () => {
    it('should create event with correct type and data', () => {
      const event = createTypedEvent('query.invalid', {
        message: 'Bad input',
        hint: 'Try again'
      });

      expect(event.type).toBe('query.invalid');
      expect(event.data.message).toBe('Bad input');
      expect(event.data.hint).toBe('Try again');
    });

    it('should generate unique IDs', () => {
      const event1 = createTypedEvent('game.initializing', {});
      const event2 = createTypedEvent('game.initializing', {});

      expect(event1.id).not.toBe(event2.id);
    });

    it('should include timestamp', () => {
      const before = Date.now();
      const event = createTypedEvent('game.initializing', {});
      const after = Date.now();

      expect(event.timestamp).toBeGreaterThanOrEqual(before);
      expect(event.timestamp).toBeLessThanOrEqual(after);
    });

    it('should apply options when provided', () => {
      const event = createTypedEvent('turn.started', { turn: 1 }, {
        entities: { actor: 'player' },
        tags: ['combat'],
        priority: 10,
        narrate: true,
        id: 'custom-id'
      });

      expect(event.id).toBe('custom-id');
      expect(event.entities).toEqual({ actor: 'player' });
      expect(event.tags).toEqual(['combat']);
      expect(event.priority).toBe(10);
      expect(event.narrate).toBe(true);
    });

    it('should default entities to empty object', () => {
      const event = createTypedEvent('game.quit', {});
      expect(event.entities).toEqual({});
    });
  });

  describe('createMessageEvent', () => {
    it('should create success message event', () => {
      const event = createMessageEvent('success', 'item_taken', {
        item: 'brass lantern'
      });

      expect(event.type).toBe('message.success');
      expect(event.data.messageId).toBe('item_taken');
      expect(event.data.params).toEqual({ item: 'brass lantern' });
    });

    it('should create failure message event', () => {
      const event = createMessageEvent('failure', 'cant_take', {
        reason: 'too heavy'
      });

      expect(event.type).toBe('message.failure');
      expect(event.data.messageId).toBe('cant_take');
    });

    it('should create message without params', () => {
      const event = createMessageEvent('info', 'score_update');

      expect(event.type).toBe('message.info');
      expect(event.data.messageId).toBe('score_update');
      expect(event.data.params).toBeUndefined();
    });
  });

  describe('createEmptyEvent', () => {
    it('should create event with empty data', () => {
      const event = createEmptyEvent('game.quit');

      expect(event.type).toBe('game.quit');
      expect(event.data).toEqual({});
    });

    it('should accept options', () => {
      const event = createEmptyEvent('platform.quit_cancelled', {
        narrate: false
      });

      expect(event.type).toBe('platform.quit_cancelled');
      expect(event.narrate).toBe(false);
    });
  });

  describe('resetEventCounter', () => {
    it('should reset the counter so IDs restart', () => {
      const event1 = createTypedEvent('game.initializing', {});
      resetEventCounter();
      const event2 = createTypedEvent('game.initializing', {});

      // After reset, the counter portion restarts — IDs differ only by timestamp
      // Both should have counter=1 after reset
      const counter1 = event1.id.split('-').pop();
      const counter2 = event2.id.split('-').pop();
      expect(counter1).toBe('1');
      expect(counter2).toBe('1');
    });
  });
});
