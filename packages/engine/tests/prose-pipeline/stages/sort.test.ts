/**
 * Tests for `sortEventsForProse` and `getChainMetadata` — rewritten to
 * the ADR-296 D0 contract (D7): emission order survives within a
 * transaction; slot-stamped phrases insert at their frame boundary;
 * transactions keep occurrence order; absent transaction ids never
 * group; fixtures (banner first, implicit-take first) hold.
 *
 * @see ADR-296 Turn narrative slots
 * @see ADR-094 Event Chaining, Amendment A1
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  sortEventsForProse,
  getChainMetadata,
} from '../../../src/prose-pipeline/stages/sort';
import type { ISemanticEvent } from '@sharpee/core';

let eventCounter = 0;

/**
 * Create an event with optional transaction/placement metadata.
 */
function makeEvent(
  type: string,
  transactionId?: string,
  extra?: Record<string, unknown>,
): ISemanticEvent {
  return {
    id: `evt-${type}-${++eventCounter}`,
    type,
    timestamp: Date.now(),
    entities: {},
    data: {
      ...(transactionId === undefined ? {} : { _transactionId: transactionId }),
      ...extra,
    },
  };
}

/** Phrase event with a declared slot. */
function makePhrase(
  slot: string,
  transactionId?: string,
  messageId = `msg-${eventCounter + 1}`,
): ISemanticEvent {
  return makeEvent('game.message', transactionId, {
    messageId,
    _narrativeSlot: slot,
  });
}

describe('sortEventsForProse', () => {
  describe('fixtures (contract rule 4)', () => {
    it('sorts game.started before domain events (banner first in the turn)', () => {
      const result = sortEventsForProse([
        makeEvent('if.event.room.description', 'txn-1'),
        makeEvent('game.started'),
      ]);
      expect(result[0].type).toBe('game.started');
      expect(result[1].type).toBe('if.event.room.description');
    });

    it('sorts all lifecycle events before non-lifecycle, preserving their order', () => {
      const result = sortEventsForProse([
        makeEvent('action.success', 'txn-1'),
        makeEvent('game.loaded'),
        makeEvent('game.starting'),
      ]);
      expect(result[0].type).toBe('game.loaded');
      expect(result[1].type).toBe('game.starting');
      expect(result[2].type).toBe('action.success');
    });

    it('does not treat game.message as a lifecycle event', () => {
      const result = sortEventsForProse([
        makeEvent('game.message'),
        makeEvent('game.started'),
      ]);
      expect(result[0].type).toBe('game.started');
      expect(result[1].type).toBe('game.message');
    });

    it('sorts implicit_take first in its transaction', () => {
      const result = sortEventsForProse([
        makeEvent('if.event.read', 'txn-1', { messageId: 'reads' }),
        makeEvent('if.event.implicit_take', 'txn-1'),
      ]);
      expect(result[0].type).toBe('if.event.implicit_take');
      expect(result[1].type).toBe('if.event.read');
    });
  });

  describe('emission order within a transaction (contract rule 1)', () => {
    it('keeps unstamped events exactly in emission order — no type-based hoists', () => {
      // Pre-ADR-296, room.description and action.* hoisted over earlier
      // events. Deleted (D5): the emitter's order is the order.
      const result = sortEventsForProse([
        makeEvent('if.event.opened', 'txn-1'),
        makeEvent('if.event.revealed', 'txn-1'),
        makeEvent('action.success', 'txn-1'),
        makeEvent('if.event.room.description', 'txn-1'),
      ]);
      expect(result.map(e => e.type)).toEqual([
        'if.event.opened',
        'if.event.revealed',
        'action.success',
        'if.event.room.description',
      ]);
    });

    it('never swaps an unrelated pair of unstamped events in the same transaction (stability)', () => {
      const a = makeEvent('if.event.alpha', 'txn-1');
      const b = makeEvent('if.event.beta', 'txn-1');
      const once = sortEventsForProse([a, b]);
      expect(once.map(e => e.id)).toEqual([a.id, b.id]);
      // Idempotent: sorting the sorted output changes nothing.
      const twice = sortEventsForProse(once);
      expect(twice.map(e => e.id)).toEqual([a.id, b.id]);
    });
  });

  describe('missing-id never groups (D1 — inverse of the pre-ADR-296 defect test)', () => {
    it('applies NO within-transaction rules across events with absent transaction ids', () => {
      // Pre-ADR-296, all-absent ids compared equal and the whole turn was
      // treated as one transaction (GH #208). Now an absent id groups with
      // nothing: implicit_take would hoist if these grouped — it must not.
      const result = sortEventsForProse([
        makeEvent('action.success'),
        makeEvent('if.event.implicit_take'),
      ]);
      expect(result.map(e => e.type)).toEqual([
        'action.success',
        'if.event.implicit_take',
      ]);
    });

    it('does not place an unstamped-transaction phrase against another source\'s anchor', () => {
      // A slotted phrase with NO transaction id is a frame of one — it must
      // not migrate to after some other source's room description.
      const phrase = makePhrase('afterRoomDescription', undefined, 'stray');
      const result = sortEventsForProse([
        phrase,
        makeEvent('if.event.room.description', 'txn-1'),
        makeEvent('if.event.list.contents', 'txn-1'),
      ]);
      expect(result.map(e => e.type)).toEqual([
        'game.message',
        'if.event.room.description',
        'if.event.list.contents',
      ]);
    });
  });

  describe('slot insertion (contract rule 2, D2/D3)', () => {
    it('inserts an afterRoomDescription phrase after the full anchor cluster', () => {
      // Cluster: description + following contents events, with an
      // illustrated event interleaved (skipped, not broken on, not moved).
      const phrase = makePhrase('afterRoomDescription', 'txn-1', 'trap.snaps');
      const result = sortEventsForProse([
        phrase, // emitted first — must move below the whole cluster
        makeEvent('if.event.room.description', 'txn-1'),
        makeEvent('if.event.illustrated', 'txn-1'),
        makeEvent('if.event.list.contents', 'txn-1'),
        makeEvent('if.event.list.contents', 'txn-1'),
        makeEvent('if.event.scored', 'txn-1'),
      ]);
      expect(result.map(e => e.type)).toEqual([
        'if.event.room.description',
        'if.event.illustrated',
        'if.event.list.contents',
        'if.event.list.contents',
        'game.message', // after the player has been told what they see
        'if.event.scored',
      ]);
    });

    it('inserts a beforeRoomDescription phrase before the anchor', () => {
      const phrase = makePhrase('beforeRoomDescription', 'txn-1', 'disoriented');
      const result = sortEventsForProse([
        makeEvent('if.event.went', 'txn-1'),
        makeEvent('if.event.room.description', 'txn-1'),
        makeEvent('if.event.list.contents', 'txn-1'),
        phrase, // emitted last — declared before the description
      ]);
      expect(result.map(e => e.type)).toEqual([
        'if.event.went',
        'game.message',
        'if.event.room.description',
        'if.event.list.contents',
      ]);
    });

    it('places an afterEverything phrase transaction-final', () => {
      const phrase = makePhrase('afterEverything', 'txn-1', 'epilogue');
      const result = sortEventsForProse([
        phrase,
        makeEvent('if.event.room.description', 'txn-1'),
        makeEvent('if.event.list.contents', 'txn-1'),
        makeEvent('if.event.scored', 'txn-1'),
      ]);
      expect(result.map(e => e.type)).toEqual([
        'if.event.room.description',
        'if.event.list.contents',
        'if.event.scored',
        'game.message',
      ]);
    });

    it('keeps emission order among multiple phrases sharing a slot', () => {
      const first = makePhrase('afterRoomDescription', 'txn-1', 'first');
      const second = makePhrase('afterRoomDescription', 'txn-1', 'second');
      const result = sortEventsForProse([
        first,
        second,
        makeEvent('if.event.room.description', 'txn-1'),
      ]);
      expect(
        result.map(e => (e.data as Record<string, unknown>).messageId)
      ).toEqual([undefined, 'first', 'second']);
    });

    it.each(['if.event.room.description', 'if.event.room_description'])(
      'recognizes %s as the anchor',
      (roomType) => {
        const phrase = makePhrase('afterRoomDescription', 'txn-1', 'consequence');
        const result = sortEventsForProse([
          phrase,
          makeEvent(roomType, 'txn-1'),
        ]);
        expect(result.map(e => e.type)).toEqual([roomType, 'game.message']);
      },
    );
  });

  describe('anchor-less collapse (D2)', () => {
    it('places an afterRoomDescription phrase after the primary report event in a TAKE-shaped transaction', () => {
      const phrase = makePhrase('afterRoomDescription', 'txn-take', 'consequence');
      const result = sortEventsForProse([
        phrase, // emitted first
        makeEvent('if.event.taken', 'txn-take', { messageId: 'taken' }), // primary
        makeEvent('if.event.scored', 'txn-take'),
      ]);
      expect(result.map(e => e.type)).toEqual([
        'if.event.taken',
        'game.message',
        'if.event.scored',
      ]);
    });

    it('keeps afterEverything transaction-final in the collapsed frame', () => {
      const phrase = makePhrase('afterEverything', 'txn-take', 'aftermath');
      const result = sortEventsForProse([
        phrase,
        makeEvent('if.event.taken', 'txn-take', { messageId: 'taken' }),
        makeEvent('if.event.scored', 'txn-take'),
      ]);
      expect(result.map(e => e.type)).toEqual([
        'if.event.taken',
        'if.event.scored',
        'game.message',
      ]);
    });
  });

  describe('transactions keep occurrence order (contract rule 3)', () => {
    it('preserves source order: action transaction, then plugin batches', () => {
      const result = sortEventsForProse([
        makeEvent('if.event.taken', 'txn:1:action', { messageId: 'taken' }),
        makeEvent('if.event.scored', 'txn:1:action'),
        makeEvent('if.event.npc_acted', 'txn:1:plugin:npc'),
        makeEvent('if.event.room.description', 'txn:1:plugin:npc'),
        makeEvent('if.event.daemon_ticked', 'txn:1:plugin:scheduler'),
      ]);
      expect(result.map(e => e.type)).toEqual([
        'if.event.taken',
        'if.event.scored',
        'if.event.npc_acted',
        'if.event.room.description',
        'if.event.daemon_ticked',
      ]);
    });

    it('scopes slot insertion per transaction — a daemon\'s description does not capture the action\'s phrase', () => {
      // GH #208's shape: the wait turn's own prose vs a daemon's room
      // description in the same turn. Each transaction places its own
      // phrases; the daemon's anchor attracts nothing from the action.
      const actionPhrase = makePhrase('afterRoomDescription', 'txn:1:action', 'you.wait');
      const result = sortEventsForProse([
        actionPhrase,
        makeEvent('if.event.waited', 'txn:1:action', { messageId: 'waited' }),
        makeEvent('if.event.room.description', 'txn:1:plugin:daemon'),
        makeEvent('if.event.list.contents', 'txn:1:plugin:daemon'),
      ]);
      expect(result.map(e => e.type)).toEqual([
        'if.event.waited',   // action primary (collapsed frame)
        'game.message',      // action phrase, after ITS OWN primary
        'if.event.room.description', // daemon transaction, in occurrence order
        'if.event.list.contents',
      ]);
    });
  });

  describe('second-anchor defect guard (D2)', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('warns and lets the first room description anchor', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const phrase = makePhrase('afterRoomDescription', 'txn-1', 'consequence');
      const result = sortEventsForProse([
        phrase,
        makeEvent('if.event.room.description', 'txn-1'),
        makeEvent('if.event.scored', 'txn-1'),
        makeEvent('if.event.room.description', 'txn-1'),
      ]);
      // Warned, did not throw, first one anchored (phrase right after it).
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(result.map(e => e.type)).toEqual([
        'if.event.room.description',
        'game.message',
        'if.event.scored',
        'if.event.room.description', // second stays at stream position
      ]);
    });
  });

  it('handles empty input', () => {
    expect(sortEventsForProse([])).toHaveLength(0);
  });

  it('does not mutate the original array', () => {
    const events = [
      makeEvent('if.event.revealed', 'txn-1'),
      makePhrase('afterRoomDescription', 'txn-1'),
      makeEvent('if.event.room.description', 'txn-1'),
    ];
    const originalOrder = events.map((e) => e.id);
    sortEventsForProse(events);
    expect(events.map((e) => e.id)).toEqual(originalOrder);
  });
});

describe('getChainMetadata', () => {
  it('extracts all provenance and placement fields', () => {
    const event = makeEvent('if.event.revealed', 'txn-1', {
      _chainDepth: 2,
      _chainedFrom: 'if.event.opened',
      _chainSourceId: 'evt-123',
      _narrativeSlot: 'afterRoomDescription',
    });
    const meta = getChainMetadata(event);
    expect(meta._transactionId).toBe('txn-1');
    expect(meta._chainDepth).toBe(2);
    expect(meta._chainedFrom).toBe('if.event.opened');
    expect(meta._chainSourceId).toBe('evt-123');
    expect(meta._narrativeSlot).toBe('afterRoomDescription');
  });

  it('returns undefined for missing metadata fields', () => {
    const meta = getChainMetadata(makeEvent('action.success'));
    expect(meta._transactionId).toBeUndefined();
    expect(meta._chainDepth).toBeUndefined();
    expect(meta._chainedFrom).toBeUndefined();
    expect(meta._chainSourceId).toBeUndefined();
    expect(meta._narrativeSlot).toBeUndefined();
  });

  it('handles event with no data', () => {
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
