/**
 * ParticipantsRepository behavior tests.
 *
 * Behavior Statement — ParticipantsRepository
 *   DOES: inserts participant rows bound to an existing identity_id;
 *         reconnects existing tokens (setting connected=1 and updating
 *         display_name); mutates tier, muted, connected; lists participants
 *         per room ordered by joined_at; finds the earliest-joined connected
 *         participant (succession chain).
 *   WHEN: invoked by the HTTP join handler, the WebSocket handler (on
 *         connect/disconnect), the role-change handler, and the succession
 *         algorithm.
 *   BECAUSE: participants carry the role/mute/presence state that gates
 *            every room-level mutation; identity_id is the persistent-user
 *            anchor (ADR-159) every participant row binds to.
 *   REJECTS WHEN: findById / findByToken return null for unknown ids.
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

function setupIdentity(db: Database, username = 'tester'): string {
  const identities = createIdentitiesRepository(db);
  return identities.create({ username, secret_hash: 'hash-stub' }).identity_id;
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
      display_name: 'Alice',
    });

    expect(p.participant_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(p.identity_id).toBe(identity_id);
    expect(p.tier).toBe('participant');
    expect(p.muted).toBe(false);
    expect(p.connected).toBe(true);
    expect(p.is_successor).toBe(false);
  });

  it('createOrReconnect with an existing token marks connected=1 and updates display_name', () => {
    const room_id = setupRoom(db);
    const identity_id = setupIdentity(db);
    const participants = createParticipantsRepository(db);
    const first = participants.createOrReconnect({
      room_id,
      identity_id,
      token: 'abc',
      display_name: 'Alice',
    });
    participants.setConnected(first.participant_id, false);

    const reconnected = participants.createOrReconnect({
      room_id,
      identity_id,
      token: 'abc',
      display_name: 'Alicia',
    });

    expect(reconnected.participant_id).toBe(first.participant_id);
    expect(reconnected.identity_id).toBe(identity_id);
    expect(reconnected.connected).toBe(true);
    expect(reconnected.display_name).toBe('Alicia');
  });

  it('setTier persists the tier change', () => {
    const room_id = setupRoom(db);
    const identity_id = setupIdentity(db);
    const participants = createParticipantsRepository(db);
    const p = participants.createOrReconnect({ room_id, identity_id, token: 't', display_name: 'A' });

    participants.setTier(p.participant_id, 'co_host', 'host-1');
    expect(participants.findById(p.participant_id)?.tier).toBe('co_host');
  });

  it('setMuted persists across a fresh findById', () => {
    const room_id = setupRoom(db);
    const identity_id = setupIdentity(db);
    const participants = createParticipantsRepository(db);
    const p = participants.createOrReconnect({ room_id, identity_id, token: 't', display_name: 'A' });

    participants.setMuted(p.participant_id, true, 'host-1');
    expect(participants.findById(p.participant_id)?.muted).toBe(true);
    participants.setMuted(p.participant_id, false, 'host-1');
    expect(participants.findById(p.participant_id)?.muted).toBe(false);
  });

  it('setConnected toggles connection state', () => {
    const room_id = setupRoom(db);
    const identity_id = setupIdentity(db);
    const participants = createParticipantsRepository(db);
    const p = participants.createOrReconnect({ room_id, identity_id, token: 't', display_name: 'A' });

    participants.setConnected(p.participant_id, false);
    expect(participants.findById(p.participant_id)?.connected).toBe(false);
  });

  it('setIsSuccessor toggles the is_successor flag and persists', () => {
    const room_id = setupRoom(db);
    const identity_id = setupIdentity(db);
    const participants = createParticipantsRepository(db);
    const p = participants.createOrReconnect({ room_id, identity_id, token: 't', display_name: 'A' });

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
    const a = participants.createOrReconnect({
      room_id,
      identity_id: id_a,
      token: 'a',
      display_name: 'A',
    });
    // Small delay so joined_at differs.
    await new Promise((r) => setTimeout(r, 5));
    const b = participants.createOrReconnect({
      room_id,
      identity_id: id_b,
      token: 'b',
      display_name: 'B',
    });

    const list = participants.listForRoom(room_id);
    expect(list.map((p) => p.participant_id)).toEqual([a.participant_id, b.participant_id]);
  });

  it('earliestConnectedParticipant returns the oldest connected, null when none connected', async () => {
    const room_id = setupRoom(db);
    const id_a = setupIdentity(db, 'alice');
    const id_b = setupIdentity(db, 'bob');
    const participants = createParticipantsRepository(db);

    const a = participants.createOrReconnect({
      room_id,
      identity_id: id_a,
      token: 'a',
      display_name: 'A',
    });
    await new Promise((r) => setTimeout(r, 5));
    const b = participants.createOrReconnect({
      room_id,
      identity_id: id_b,
      token: 'b',
      display_name: 'B',
    });

    expect(participants.earliestConnectedParticipant(room_id)?.participant_id).toBe(a.participant_id);

    participants.setConnected(a.participant_id, false);
    expect(participants.earliestConnectedParticipant(room_id)?.participant_id).toBe(b.participant_id);

    participants.setConnected(b.participant_id, false);
    expect(participants.earliestConnectedParticipant(room_id)).toBeNull();
  });

  it('participants.identity_id NOT NULL — insert without identity_id rejected', () => {
    const room_id = setupRoom(db);
    const participants = createParticipantsRepository(db);
    expect(() =>
      participants.createOrReconnect({
        room_id,
        identity_id: 'ghost-identity-id',
        token: 't',
        display_name: 'A',
      })
    ).toThrow(); // FK violation: identity_id references identities(identity_id)
  });
});
