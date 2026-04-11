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

let eventCounter = 0;

/**
 * Create a minimal event with optional chain metadata
 */
function makeEvent(
  type: string,
  transactionId?: string,
  chainDepth?: number,
  extra?: Record<string, unknown>,
): ISemanticEvent {
  return {
    id: `evt-${type}-${++eventCounter}`,
    type,
    timestamp: Date.now(),
    entities: {},
    data: {
      ...(transactionId === undefined ? {} : { _transactionId: transactionId }),
      ...(chainDepth === undefined ? {} : { _chainDepth: chainDepth }),
      ...extra,
    },
  };
}

describe('sortEventsForProse', () => {
  describe('lifecycle events', () => {
    it('should sort game.started before domain events', () => {
      const roomDesc = makeEvent('if.event.room.description', 'txn-1', 0);
      const gameStarted = makeEvent('game.started');

      const result = sortEventsForProse([roomDesc, gameStarted]);

      expect(result[0].type).toBe('game.started');
      expect(result[1].type).toBe('if.event.room.description');
    });

    it('should sort all lifecycle events before non-lifecycle', () => {
      const action = makeEvent('action.success', 'txn-1', 0);
      const gameLoaded = makeEvent('game.loaded');
      const gameStarting = makeEvent('game.starting');

      const result = sortEventsForProse([action, gameLoaded, gameStarting]);

      expect(result[0].type).toBe('game.loaded');
      expect(result[1].type).toBe('game.starting');
      expect(result[2].type).toBe('action.success');
    });

    it('should not treat game.message as a lifecycle event', () => {
      const gameMessage = makeEvent('game.message');
      const gameStarted = makeEvent('game.started');

      const result = sortEventsForProse([gameMessage, gameStarted]);

      expect(result[0].type).toBe('game.started');
      expect(result[1].type).toBe('game.message');
    });
  });

  describe('transaction ordering', () => {
    it('should sort implicit_take before action.success in same transaction', () => {
      const action = makeEvent('action.success', 'txn-1', 0);
      const implicitTake = makeEvent('if.event.implicit_take', 'txn-1', 0);

      const result = sortEventsForProse([action, implicitTake]);

      expect(result[0].type).toBe('if.event.implicit_take');
      expect(result[1].type).toBe('action.success');
    });

    it('should sort room.description before action.success in same transaction', () => {
      const action = makeEvent('action.success', 'txn-1', 0);
      const roomDesc = makeEvent('if.event.room.description', 'txn-1', 0);

      const result = sortEventsForProse([action, roomDesc]);

      expect(result[0].type).toBe('if.event.room.description');
      expect(result[1].type).toBe('action.success');
    });

    it('should sort if.event.room_description (underscore variant) before action.success', () => {
      const action = makeEvent('action.success', 'txn-1', 0);
      const roomDesc = makeEvent('if.event.room_description', 'txn-1', 0);

      const result = sortEventsForProse([action, roomDesc]);

      expect(result[0].type).toBe('if.event.room_description');
      expect(result[1].type).toBe('action.success');
    });

    it('should sort action.* before non-action domain events in same transaction', () => {
      const revealed = makeEvent('if.event.revealed', 'txn-1', 1);
      const action = makeEvent('action.success', 'txn-1', 0);

      const result = sortEventsForProse([revealed, action]);

      expect(result[0].type).toBe('action.success');
      expect(result[1].type).toBe('if.event.revealed');
    });

    it('should sort by chain depth within same transaction', () => {
      const depth2 = makeEvent('if.event.revealed', 'txn-1', 2);
      const depth1 = makeEvent('if.event.opened', 'txn-1', 1);
      const depth0 = makeEvent('action.success', 'txn-1', 0);

      const result = sortEventsForProse([depth2, depth1, depth0]);

      expect(result[0].type).toBe('action.success');
      expect(result[1].type).toBe('if.event.opened');
      expect(result[2].type).toBe('if.event.revealed');
    });
  });

  describe('cross-transaction stability', () => {
    it('should preserve order of events in different transactions', () => {
      const txn1Action = makeEvent('action.success', 'txn-1', 0);
      const txn1Revealed = makeEvent('if.event.revealed', 'txn-1', 1);
      const txn2Action = makeEvent('action.success', 'txn-2', 0);
      const txn2Revealed = makeEvent('if.event.revealed', 'txn-2', 1);

      const result = sortEventsForProse([txn1Action, txn1Revealed, txn2Action, txn2Revealed]);

      expect(result.map((e) => e.type)).toEqual([
        'action.success',
        'if.event.revealed',
        'action.success',
        'if.event.revealed',
      ]);
    });

    it('should apply within-transaction rules when all events share undefined transaction ID', () => {
      const first = makeEvent('if.event.opened');
      const second = makeEvent('action.success');
      const third = makeEvent('if.event.revealed');

      const result = sortEventsForProse([first, second, third]);

      // undefined === undefined, so all events are in the "same transaction"
      // action.* sorts before non-action
      expect(result[0].type).toBe('action.success');
    });
  });

  describe('realistic scenario', () => {
    it('should produce correct prose order for "open chest" scenario', () => {
      const events = [
        makeEvent('if.event.opened', 'txn-open', 0),
        makeEvent('if.event.revealed', 'txn-open', 1, {
          containerName: 'wooden chest',
          items: [{ entityId: 'sword', name: 'a gleaming sword' }],
        }),
        makeEvent('action.success', 'txn-open', 0, {
          message: 'You open the wooden chest.',
        }),
      ];

      const result = sortEventsForProse(events);

      // action.success (depth 0, action.*) before if.event.opened (depth 0, non-action)
      // before if.event.revealed (depth 1)
      expect(result[0].type).toBe('action.success');
      expect(result[1].type).toBe('if.event.opened');
      expect(result[2].type).toBe('if.event.revealed');
    });
  });

  it('should handle empty input', () => {
    const result = sortEventsForProse([]);

    expect(result).toHaveLength(0);
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
    const event = makeEvent('action.success');

    const meta = getChainMetadata(event);

    expect(meta._transactionId).toBeUndefined();
    expect(meta._chainDepth).toBeUndefined();
    expect(meta._chainedFrom).toBeUndefined();
    expect(meta._chainSourceId).toBeUndefined();
  });

  it('should handle event with no data', () => {
    const event: ISemanticEvent = {
      id: 'evt-1',
      type: 'action.success',
      timestamp: Date.now(),
      entities: {},
    };

    const meta = getChainMetadata(event);

    expect(meta._transactionId).toBeUndefined();
    expect(meta._chainDepth).toBeUndefined();
  });
});
