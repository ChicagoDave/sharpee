/**
 * RoomsRepository behavior tests.
 *
 * Behavior Statement — RoomsRepository
 *   DOES: creates rooms with unique join codes; reads by id/code; updates
 *         last_activity_at and pinned; cascade-deletes room + all child rows
 *         (participants, session_events, saves) in one transaction; lists
 *         unpinned rooms past the idle threshold.
 *   WHEN: invoked by the HTTP layer (room create/delete) or the recycle sweeper.
 *   BECAUSE: the rooms table is the aggregate root for every room-scoped
 *            resource. Cascade-atomicity is a privacy boundary (ADR-153
 *            Atomicity #1).
 *   REJECTS WHEN: `findByJoinCode` returns null for an unknown code.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { Database } from 'better-sqlite3';
import { openTestDb } from '../helpers/test-db.js';
import { createRoomsRepository } from '../../src/repositories/rooms.js';
import { createParticipantsRepository } from '../../src/repositories/participants.js';
import { createIdentitiesRepository } from '../../src/repositories/identities.js';
import { createSessionEventsRepository } from '../../src/repositories/session-events.js';
import { createSavesRepository } from '../../src/repositories/saves.js';

describe('RoomsRepository', () => {
  let db: Database;

  beforeEach(() => {
    db = openTestDb();
  });
  afterEach(() => {
    db.close();
  });

  it('create inserts a room and returns the new record', () => {
    const rooms = createRoomsRepository(db);
    const r = rooms.create({ title: 'Cloak of Darkness', story_slug: 'cloak', primary_host_id: 'p1' });

    expect(r.room_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(r.join_code).toMatch(/^[A-Z0-9]{6}$/);
    expect(r.title).toBe('Cloak of Darkness');
    expect(r.pinned).toBe(false);

    const row = db.prepare('SELECT * FROM rooms WHERE room_id = ?').get(r.room_id);
    expect(row).toBeDefined();
  });

  it('findById returns null for an unknown id', () => {
    const rooms = createRoomsRepository(db);
    expect(rooms.findById('nope')).toBeNull();
  });

  it('findByJoinCode resolves a known code', () => {
    const rooms = createRoomsRepository(db);
    const r = rooms.create({ title: 'A', story_slug: 's', primary_host_id: 'p1' });
    expect(rooms.findByJoinCode(r.join_code)?.room_id).toBe(r.room_id);
  });

  it('setPinned persists the pinned flag', () => {
    const rooms = createRoomsRepository(db);
    const r = rooms.create({ title: 'A', story_slug: 's', primary_host_id: 'p1' });
    rooms.setPinned(r.room_id, true);
    expect(rooms.findById(r.room_id)?.pinned).toBe(true);
    rooms.setPinned(r.room_id, false);
    expect(rooms.findById(r.room_id)?.pinned).toBe(false);
  });

  it('updateLastActivity changes last_activity_at', () => {
    const rooms = createRoomsRepository(db);
    const r = rooms.create({ title: 'A', story_slug: 's', primary_host_id: 'p1' });
    const later = '2099-01-01T00:00:00.000Z';
    rooms.updateLastActivity(r.room_id, later);
    expect(rooms.findById(r.room_id)?.last_activity_at).toBe(later);
  });

  it('updatePrimaryHost rewrites the primary_host_id pointer', () => {
    const rooms = createRoomsRepository(db);
    const r = rooms.create({ title: 'A', story_slug: 's', primary_host_id: 'p1' });
    expect(rooms.findById(r.room_id)?.primary_host_id).toBe('p1');

    rooms.updatePrimaryHost(r.room_id, 'p2');
    expect(rooms.findById(r.room_id)?.primary_host_id).toBe('p2');
  });

  it('listRecycleCandidates returns unpinned rooms past the threshold; excludes pinned peers', () => {
    const rooms = createRoomsRepository(db);
    const old = rooms.create({ title: 'old', story_slug: 's', primary_host_id: 'p1' });
    const oldPinned = rooms.create({ title: 'pin', story_slug: 's', primary_host_id: 'p1' });
    const fresh = rooms.create({ title: 'fresh', story_slug: 's', primary_host_id: 'p1' });

    // Backdate `old` and `oldPinned` by 30 days.
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
    rooms.updateLastActivity(old.room_id, thirtyDaysAgo);
    rooms.updateLastActivity(oldPinned.room_id, thirtyDaysAgo);
    rooms.setPinned(oldPinned.room_id, true);

    const now = new Date().toISOString();
    const candidates = rooms.listRecycleCandidates(now, 14);

    const ids = candidates.map((c) => c.room_id);
    expect(ids).toContain(old.room_id);
    expect(ids).not.toContain(oldPinned.room_id);
    expect(ids).not.toContain(fresh.room_id);
  });

  it('delete cascades to participants, session_events, saves atomically; join code is freed', () => {
    const rooms = createRoomsRepository(db);
    const participants = createParticipantsRepository(db);
    const identities = createIdentitiesRepository(db);
    const events = createSessionEventsRepository(db);
    const saves = createSavesRepository(db);

    const identity = identities.create({ handle: 'alice', passcode_hash: 'h' });
    const room = rooms.create({ title: 'Doomed', story_slug: 's', primary_host_id: 'p1' });
    const p = participants.createOrReconnect({
      room_id: room.room_id,
      identity_id: identity.id,
      token: 't1',
    });
    events.append({
      room_id: room.room_id,
      participant_id: p.participant_id,
      kind: 'join',
      payload: { kind: 'join', display_name: 'Alice', reconnect: false },
    });
    saves.create({
      save_id: randomUUID(),
      room_id: room.room_id,
      actor_id: p.participant_id,
      name: 'save-1',
      blob: Buffer.from('opaque'),
    });

    // Preconditions
    expect(participants.listForRoom(room.room_id).length).toBe(1);
    expect(events.listForRoom(room.room_id).length).toBe(1);
    expect(saves.listForRoom(room.room_id).length).toBe(1);

    rooms.delete(room.room_id);

    // Postconditions — every child row gone; code freed (findByJoinCode returns null
    // so the code is available for reissue).
    expect(rooms.findById(room.room_id)).toBeNull();
    expect(rooms.findByJoinCode(room.join_code)).toBeNull();
    expect(participants.listForRoom(room.room_id).length).toBe(0);
    expect(events.listForRoom(room.room_id).length).toBe(0);
    expect(saves.listForRoom(room.room_id).length).toBe(0);
  });
});
