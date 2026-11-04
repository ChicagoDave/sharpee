/**
 * Typed Event System Tests
 *
 * Tests the type-safe event creation API (ADR-082): the event factory.
 */

import { describe, it, expect } from 'vitest';
import { createTypedEvent } from '../../src/events/event-factory';

describe('Typed Event System', () => {
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
});
