/**
 * ParticipantsRepository behavior tests (ADR-161).
 *
 * Behavior Statement — ParticipantsRepository
 *   DOES: inserts participant rows bound to an existing identity.id;
 *         reconnects existing tokens (setting connected=1); mutates tier,
 *         muted, connected; lists participants per room ordered by
 *         joined_at; finds the earliest-joined connected participant
 *         (succession chain).
 *   WHEN: invoked by the HTTP join handler, the WebSocket handler (on
 *         connect/disconnect), the role-change handler, and the
 *         succession algorithm.
 *   BECAUSE: participants carry the role/mute/presence state that gates
 *            every room-level mutation; identity_id is the persistent
 *            user anchor (ADR-161) every participant row references.
 *            Display name is no longer stored per-row — the joined
 *            identity's handle is the display name.
 *   REJECTS WHEN: findById / findByToken return null for unknown ids;
 *                 createOrReconnect with an identity_id that does not
 *                 reference an existing identities row throws an FK
 *                 violation.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from 'better-sqlite3';
import { openTestDb } from '../helpers/test-db.js';
import { createRoomsRepository } from '../../src/repositories/rooms.js';
import { createParticipantsRepository } from '../../src/repositories/participants.js';
import { createIdentitiesRepository } from '../../src/repositories/identities.js';

function setupRoom(db: Database): string {
  const rooms = createRoomsRepository(db);
  return rooms.create({ title: 'R', story_slug: 's', primary_host_id: 'p1' }).room_id;
}

function setupIdentity(db: Database, handle = 'tester'): string {
  const identities = createIdentitiesRepository(db);
  return identities.create({ handle, passcode_hash: 'hash-stub' }).id;
}

describe('ParticipantsRepository', () => {
  let db: Database;

  beforeEach(() => {
    db = openTestDb();
  });
  afterEach(() => {
    db.close();
  });

  it('createOrReconnect with a new token creates a participant at tier=participant', () => {
    const room_id = setupRoom(db);
    const identity_id = setupIdentity(db);
    const participants = createParticipantsRepository(db);
    const p = participants.createOrReconnect({
      room_id,
      identity_id,
      token: 'abc',
    });

    expect(p.participant_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(p.identity_id).toBe(identity_id);
    expect(p.tier).toBe('participant');
    expect(p.muted).toBe(false);
    expect(p.connected).toBe(true);
    expect(p.is_successor).toBe(false);
    // Participant no longer carries display_name (ADR-161).
    expect(p).not.toHaveProperty('display_name');
  });

  it('createOrReconnect with an existing token marks connected=1 and returns the same participant_id', () => {
    const room_id = setupRoom(db);
    const identity_id = setupIdentity(db);
    const participants = createParticipantsRepository(db);
    const first = participants.createOrReconnect({ room_id, identity_id, token: 'abc' });
    participants.setConnected(first.participant_id, false);

    const reconnected = participants.createOrReconnect({ room_id, identity_id, token: 'abc' });

    expect(reconnected.participant_id).toBe(first.participant_id);
    expect(reconnected.identity_id).toBe(identity_id);
    expect(reconnected.connected).toBe(true);
  });

  it('setTier persists the tier change', () => {
    const room_id = setupRoom(db);
    const identity_id = setupIdentity(db);
    const participants = createParticipantsRepository(db);
    const p = participants.createOrReconnect({ room_id, identity_id, token: 't' });

    participants.setTier(p.participant_id, 'co_host', 'host-1');
    expect(participants.findById(p.participant_id)?.tier).toBe('co_host');
  });

  it('setMuted persists across a fresh findById', () => {
    const room_id = setupRoom(db);
    const identity_id = setupIdentity(db);
    const participants = createParticipantsRepository(db);
    const p = participants.createOrReconnect({ room_id, identity_id, token: 't' });

    participants.setMuted(p.participant_id, true, 'host-1');
    expect(participants.findById(p.participant_id)?.muted).toBe(true);
    participants.setMuted(p.participant_id, false, 'host-1');
    expect(participants.findById(p.participant_id)?.muted).toBe(false);
  });

  it('setConnected toggles connection state', () => {
    const room_id = setupRoom(db);
    const identity_id = setupIdentity(db);
    const participants = createParticipantsRepository(db);
    const p = participants.createOrReconnect({ room_id, identity_id, token: 't' });

    participants.setConnected(p.participant_id, false);
    expect(participants.findById(p.participant_id)?.connected).toBe(false);
  });

  it('setIsSuccessor toggles the is_successor flag and persists', () => {
    const room_id = setupRoom(db);
    const identity_id = setupIdentity(db);
    const participants = createParticipantsRepository(db);
    const p = participants.createOrReconnect({ room_id, identity_id, token: 't' });

    expect(participants.findById(p.participant_id)?.is_successor).toBe(false);

    participants.setIsSuccessor(p.participant_id, true);
    expect(participants.findById(p.participant_id)?.is_successor).toBe(true);

    participants.setIsSuccessor(p.participant_id, false);
    expect(participants.findById(p.participant_id)?.is_successor).toBe(false);
  });

  it('listForRoom orders by joined_at ascending', async () => {
    const room_id = setupRoom(db);
    const id_a = setupIdentity(db, 'alice');
    const id_b = setupIdentity(db, 'bob');
    const participants = createParticipantsRepository(db);
    const a = participants.createOrReconnect({ room_id, identity_id: id_a, token: 'a' });
    // Small delay so joined_at differs.
    await new Promise((r) => setTimeout(r, 5));
    const b = participants.createOrReconnect({ room_id, identity_id: id_b, token: 'b' });

    const list = participants.listForRoom(room_id);
    expect(list.map((p) => p.participant_id)).toEqual([a.participant_id, b.participant_id]);
  });

  it('earliestConnectedParticipant returns the oldest connected, null when none connected', async () => {
    const room_id = setupRoom(db);
    const id_a = setupIdentity(db, 'alice');
    const id_b = setupIdentity(db, 'bob');
    const participants = createParticipantsRepository(db);

    const a = participants.createOrReconnect({ room_id, identity_id: id_a, token: 'a' });
    await new Promise((r) => setTimeout(r, 5));
    const b = participants.createOrReconnect({ room_id, identity_id: id_b, token: 'b' });

    expect(participants.earliestConnectedParticipant(room_id)?.participant_id).toBe(a.participant_id);

    participants.setConnected(a.participant_id, false);
    expect(participants.earliestConnectedParticipant(room_id)?.participant_id).toBe(b.participant_id);

    participants.setConnected(b.participant_id, false);
    expect(participants.earliestConnectedParticipant(room_id)).toBeNull();
  });

  it('participants.identity_id NOT NULL — insert with an identity_id that does not exist throws FK violation', () => {
    const room_id = setupRoom(db);
    const participants = createParticipantsRepository(db);
    expect(() =>
      participants.createOrReconnect({
        room_id,
        identity_id: 'GHST-XXXX', // never inserted into identities
        token: 't',
      }),
    ).toThrow();
  });
});
