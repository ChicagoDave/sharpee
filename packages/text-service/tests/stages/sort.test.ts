/**
 * Tests for sortEventsForProse and getChainMetadata pipeline stage
 *
 * Verifies prose ordering: lifecycle first, then within transactions:
 * implicit_take → room.description → action.* → others, by chain depth.
 *
 * @see ADR-094 Event Chaining
 * @see ADR-096 Text Service Architecture
 */

import { describe, it, expect } from 'vitest';
import { sortEventsForProse, getChainMetadata } from '../../src/stages/sort.js';
import type { ISemanticEvent } from '@sharpee/core';
import { makeEvent as baseEvent } from '../test-helpers.js';

/**
 * Create an event with optional chain metadata (extends shared makeEvent)
 */
function makeEvent(
  type: string,
  transactionId?: string,
  chainDepth?: number,
  extra?: Record<string, unknown>,
): ISemanticEvent {
  return baseEvent(type, {
    ...(transactionId === undefined ? {} : { _transactionId: transactionId }),
    ...(chainDepth === undefined ? {} : { _chainDepth: chainDepth }),
    ...extra,
  });
}

describe('sortEventsForProse', () => {
  describe('lifecycle events', () => {
    it('should sort game.started before domain events', () => {
      const result = sortEventsForProse([
        makeEvent('if.event.room.description', 'txn-1', 0),
        makeEvent('game.started'),
      ]);
      expect(result[0].type).toBe('game.started');
      expect(result[1].type).toBe('if.event.room.description');
    });

    it('should sort all lifecycle events before non-lifecycle', () => {
      const result = sortEventsForProse([
        makeEvent('action.success', 'txn-1', 0),
        makeEvent('game.loaded'),
        makeEvent('game.starting'),
      ]);
      expect(result[0].type).toBe('game.loaded');
      expect(result[1].type).toBe('game.starting');
      expect(result[2].type).toBe('action.success');
    });

    it('should not treat game.message as a lifecycle event', () => {
      const result = sortEventsForProse([makeEvent('game.message'), makeEvent('game.started')]);
      expect(result[0].type).toBe('game.started');
      expect(result[1].type).toBe('game.message');
    });
  });

  describe('transaction ordering', () => {
    it('should sort implicit_take before action.success in same transaction', () => {
      const result = sortEventsForProse([
        makeEvent('action.success', 'txn-1', 0),
        makeEvent('if.event.implicit_take', 'txn-1', 0),
      ]);
      expect(result[0].type).toBe('if.event.implicit_take');
      expect(result[1].type).toBe('action.success');
    });

    it.each(['if.event.room.description', 'if.event.room_description'])(
      'should sort %s before action.success in same transaction',
      (roomType) => {
        const result = sortEventsForProse([
          makeEvent('action.success', 'txn-1', 0),
          makeEvent(roomType, 'txn-1', 0),
        ]);
        expect(result[0].type).toBe(roomType);
        expect(result[1].type).toBe('action.success');
      },
    );

    it('should sort action.* before non-action domain events in same transaction', () => {
      const result = sortEventsForProse([
        makeEvent('if.event.revealed', 'txn-1', 1),
        makeEvent('action.success', 'txn-1', 0),
      ]);
      expect(result[0].type).toBe('action.success');
      expect(result[1].type).toBe('if.event.revealed');
    });

    it('should sort by chain depth within same transaction', () => {
      const result = sortEventsForProse([
        makeEvent('if.event.revealed', 'txn-1', 2),
        makeEvent('if.event.opened', 'txn-1', 1),
        makeEvent('action.success', 'txn-1', 0),
      ]);
      expect(result[0].type).toBe('action.success');
      expect(result[1].type).toBe('if.event.opened');
      expect(result[2].type).toBe('if.event.revealed');
    });
  });

  describe('cross-transaction stability', () => {
    it('should preserve order of events in different transactions', () => {
      const result = sortEventsForProse([
        makeEvent('action.success', 'txn-1', 0),
        makeEvent('if.event.revealed', 'txn-1', 1),
        makeEvent('action.success', 'txn-2', 0),
        makeEvent('if.event.revealed', 'txn-2', 1),
      ]);
      expect(result.map((e) => e.type)).toEqual([
        'action.success', 'if.event.revealed', 'action.success', 'if.event.revealed',
      ]);
    });

    it('should apply within-transaction rules when all events share undefined transaction ID', () => {
      const result = sortEventsForProse([
        makeEvent('if.event.opened'),
        makeEvent('action.success'),
        makeEvent('if.event.revealed'),
      ]);
      expect(result[0].type).toBe('action.success');
    });
  });

  describe('realistic scenario', () => {
    it('should produce correct prose order for "open chest" scenario', () => {
      const result = sortEventsForProse([
        makeEvent('if.event.opened', 'txn-open', 0),
        makeEvent('if.event.revealed', 'txn-open', 1, {
          containerName: 'wooden chest',
          items: [{ entityId: 'sword', name: 'a gleaming sword' }],
        }),
        makeEvent('action.success', 'txn-open', 0, { message: 'You open the wooden chest.' }),
      ]);
      expect(result[0].type).toBe('action.success');
      expect(result[1].type).toBe('if.event.opened');
      expect(result[2].type).toBe('if.event.revealed');
    });
  });

  it('should handle empty input', () => {
    expect(sortEventsForProse([])).toHaveLength(0);
  });

  it('should not mutate the original array', () => {
    const events = [
      makeEvent('if.event.revealed', 'txn-1', 1),
      makeEvent('action.success', 'txn-1', 0),
    ];
    const originalOrder = events.map((e) => e.type);
    sortEventsForProse(events);
    expect(events.map((e) => e.type)).toEqual(originalOrder);
  });
});

describe('getChainMetadata', () => {
  it('should extract all chain metadata fields', () => {
    const event = makeEvent('if.event.revealed', 'txn-1', 2, {
      _chainedFrom: 'if.event.opened',
      _chainSourceId: 'evt-123',
    });
    const meta = getChainMetadata(event);
    expect(meta._transactionId).toBe('txn-1');
    expect(meta._chainDepth).toBe(2);
    expect(meta._chainedFrom).toBe('if.event.opened');
    expect(meta._chainSourceId).toBe('evt-123');
  });

  it('should return undefined for missing metadata fields', () => {
    const meta = getChainMetadata(makeEvent('action.success'));
    expect(meta._transactionId).toBeUndefined();
    expect(meta._chainDepth).toBeUndefined();
    expect(meta._chainedFrom).toBeUndefined();
    expect(meta._chainSourceId).toBeUndefined();
  });

  it('should handle event with no data', () => {
    const event: ISemanticEvent = {
      id: 'evt-1', type: 'action.success', timestamp: Date.now(), entities: {},
    };
    const meta = getChainMetadata(event);
    expect(meta._transactionId).toBeUndefined();
    expect(meta._chainDepth).toBeUndefined();
  });
});
