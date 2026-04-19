/**
 * SessionEventsRepository behavior tests.
 *
 * Behavior Statement — SessionEventsRepository
 *   DOES: appends rows to session_events with an auto-incrementing event_id;
 *         reads back rows filtered by since_event_id, limit, and kinds.
 *   WHEN: invoked by every action that produces a recordable event
 *         (command, output, chat, dm, role change, save, restore, join,
 *         leave, lifecycle).
 *   BECAUSE: the unified log drives replay, transcript export, audit, and
 *            debugging (ADR-153 Decision 11).
 *   REJECTS WHEN: listForRoom for an unknown room returns an empty array.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from 'better-sqlite3';
import { openTestDb } from '../helpers/test-db.js';
import { createRoomsRepository } from '../../src/repositories/rooms.js';
import { createSessionEventsRepository } from '../../src/repositories/session-events.js';

function setupRoom(db: Database): string {
  const rooms = createRoomsRepository(db);
  return rooms.create({ title: 'R', story_slug: 's', primary_host_id: 'p1' }).room_id;
}

describe('SessionEventsRepository', () => {
  let db: Database;

  beforeEach(() => {
    db = openTestDb();
  });
  afterEach(() => {
    db.close();
  });

  it('append returns incrementing event_ids', () => {
    const room_id = setupRoom(db);
    const events = createSessionEventsRepository(db);

    const id1 = events.append({
      room_id,
      participant_id: null,
      kind: 'lifecycle',
      payload: { kind: 'lifecycle', op: 'created' },
    });
    const id2 = events.append({
      room_id,
      participant_id: null,
      kind: 'chat',
      payload: { kind: 'chat', text: 'hi' },
    });

    expect(id2).toBeGreaterThan(id1);
  });

  it('listForRoom with since_event_id returns only later events', () => {
    const room_id = setupRoom(db);
    const events = createSessionEventsRepository(db);

    const id1 = events.append({
      room_id,
      participant_id: null,
      kind: 'lifecycle',
      payload: { kind: 'lifecycle', op: 'created' },
    });
    events.append({
      room_id,
      participant_id: null,
      kind: 'chat',
      payload: { kind: 'chat', text: 'hi' },
    });

    const after = events.listForRoom(room_id, { since_event_id: id1 });
    expect(after.length).toBe(1);
    expect(after[0]!.kind).toBe('chat');
  });

  it('listForRoom with kinds filter returns only matching kinds', () => {
    const room_id = setupRoom(db);
    const events = createSessionEventsRepository(db);

    events.append({
      room_id,
      participant_id: null,
      kind: 'lifecycle',
      payload: { kind: 'lifecycle', op: 'created' },
    });
    events.append({
      room_id,
      participant_id: null,
      kind: 'chat',
      payload: { kind: 'chat', text: 'hi' },
    });
    events.append({
      room_id,
      participant_id: null,
      kind: 'chat',
      payload: { kind: 'chat', text: 'bye' },
    });

    const chats = events.listForRoom(room_id, { kinds: ['chat'] });
    expect(chats.length).toBe(2);
    expect(chats.every((e) => e.kind === 'chat')).toBe(true);
  });

  it('listForRoom with limit caps the result', () => {
    const room_id = setupRoom(db);
    const events = createSessionEventsRepository(db);

    for (let i = 0; i < 5; i++) {
      events.append({
        room_id,
        participant_id: null,
        kind: 'chat',
        payload: { kind: 'chat', text: `m${i}` },
      });
    }

    const first2 = events.listForRoom(room_id, { limit: 2 });
    expect(first2.length).toBe(2);
  });

  it('listForRoom returns [] for an unknown room', () => {
    const events = createSessionEventsRepository(db);
    expect(events.listForRoom('no-such-room')).toEqual([]);
  });

  it('payloads round-trip as their original shape', () => {
    const room_id = setupRoom(db);
    const events = createSessionEventsRepository(db);

    events.append({
      room_id,
      participant_id: 'p-1',
      kind: 'role',
      payload: {
        kind: 'role',
        op: 'promote',
        target_participant_id: 'p-2',
        from_tier: 'participant',
        to_tier: 'command_entrant',
      },
    });

    const [evt] = events.listForRoom(room_id);
    expect(evt!.payload).toEqual({
      kind: 'role',
      op: 'promote',
      target_participant_id: 'p-2',
      from_tier: 'participant',
      to_tier: 'command_entrant',
    });
  });
});
