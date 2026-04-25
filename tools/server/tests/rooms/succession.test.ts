/**
 * performSuccession behavior tests.
 *
 * Behavior Statement — performSuccession
 *   DOES: in one db.transaction, demotes the current primary_host to
 *         participant, promotes the designated successor (is_successor=1)
 *         to primary_host, rewrites rooms.primary_host_id, and elevates the
 *         earliest-connected participant (excluding the new PH) to co_host +
 *         is_successor. Appends role events for every tier change and the
 *         nomination, with participant_id=null (system actor).
 *   WHEN: the PH grace timer fires after 5m of PH disconnection, or on
 *         explicit test-driven trigger.
 *   BECAUSE: ADR-153 Decision 6 — a room must always have exactly one PH;
 *            the chain keeps that invariant stable across disconnects.
 *   REJECTS WHEN:
 *     - no participant has is_successor=1  → returns no_successor; no state
 *                                            change, no events.
 *     - room does not exist                → returns no_successor; no state
 *                                            change.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from 'better-sqlite3';
import { openTestDb } from '../helpers/test-db.js';
import { createRoomsRepository } from '../../src/repositories/rooms.js';
import { createParticipantsRepository } from '../../src/repositories/participants.js';
import { createIdentitiesRepository } from '../../src/repositories/identities.js';
import { createSessionEventsRepository } from '../../src/repositories/session-events.js';
import { performSuccession, type SuccessionDeps } from '../../src/rooms/succession.js';
import type { Tier } from '../../src/repositories/types.js';

function buildDeps(db: Database): SuccessionDeps {
  return {
    db,
    rooms: createRoomsRepository(db),
    participants: createParticipantsRepository(db),
    sessionEvents: createSessionEventsRepository(db),
  };
}

function seedRoom(
  deps: SuccessionDeps,
  members: Array<{
    name: string;
    tier: Tier;
    connected?: boolean;
    is_successor?: boolean;
    joined_offset_ms?: number;
  }>
): { room_id: string; ids: Record<string, string> } {
  // Create PH member first so rooms.create has a valid host id.
  const phMember = members.find((m) => m.tier === 'primary_host');
  if (!phMember) throw new Error('test fixture: must include a primary_host member');

  // Create participants — earliest-first joined order matches array order.
  const room = deps.rooms.create({
    title: 'R',
    story_slug: 's',
    primary_host_id: 'pending', // overwritten below once we have the PH id
  });

  const ids: Record<string, string> = {};

  // Participants are inserted via the repo; joined_at is `now()`. To
  // guarantee a deterministic joined_at order we sleep 1ms between inserts.
  // Each participant binds to a unique identity (ADR-159).
  const identities = createIdentitiesRepository(deps.db);
  for (const m of members) {
    const identity = identities.create({ username: `id-${m.name}`, secret_hash: 'h' });
    const p = deps.participants.createWithId({
      participant_id: `p-${m.name}`,
      room_id: room.room_id,
      identity_id: identity.identity_id,
      token: `tok-${m.name}`,
      display_name: m.name,
      tier: m.tier,
    });
    ids[m.name] = p.participant_id;
    if (m.connected === false) deps.participants.setConnected(p.participant_id, false);
    if (m.is_successor) deps.participants.setIsSuccessor(p.participant_id, true);
    // Nudge joined_at forward so list order is deterministic.
    const sleep_ms = 2;
    const until = Date.now() + sleep_ms;
    while (Date.now() < until) {
      /* spin — cheap and deterministic in tests */
    }
  }

  deps.rooms.updatePrimaryHost(room.room_id, ids[phMember.name]!);

  return { room_id: room.room_id, ids };
}

interface RoleEventRow {
  participant_id: string | null;
  payload: string;
}

function listRoleEvents(db: Database, room_id: string): Array<{
  actor: string | null;
  op: string;
  target: string;
  from_tier?: string;
  to_tier?: string;
}> {
  const rows = db
    .prepare(
      `SELECT participant_id, payload FROM session_events WHERE room_id = ? AND kind = 'role' ORDER BY event_id ASC`
    )
    .all(room_id) as RoleEventRow[];
  return rows.map((r) => {
    const p = JSON.parse(r.payload) as {
      kind: string;
      op: string;
      target_participant_id: string;
      from_tier?: string;
      to_tier?: string;
    };
    return {
      actor: r.participant_id,
      op: p.op,
      target: p.target_participant_id,
      from_tier: p.from_tier,
      to_tier: p.to_tier,
    };
  });
}

describe('performSuccession', () => {
  let db: Database;
  let deps: SuccessionDeps;

  beforeEach(() => {
    db = openTestDb();
    deps = buildDeps(db);
  });
  afterEach(() => {
    db.close();
  });

  it('PH + designated Co-Host + 1 Participant: full chain — successor → PH, participant → co_host + successor', () => {
    // Real invocation: succession only fires while the PH is still disconnected.
    const { room_id, ids } = seedRoom(deps, [
      { name: 'ph', tier: 'primary_host', connected: false },
      { name: 'cohost', tier: 'co_host', is_successor: true },
      { name: 'alice', tier: 'participant' },
    ]);

    const outcome = performSuccession(deps, room_id);

    expect(outcome).toEqual({
      kind: 'succeeded',
      old_ph_id: ids.ph,
      new_ph_id: ids.cohost,
      new_co_host_id: ids.alice,
    });

    // Tier mutations
    expect(deps.participants.findById(ids.ph!)!.tier).toBe('participant');
    expect(deps.participants.findById(ids.cohost!)!.tier).toBe('primary_host');
    expect(deps.participants.findById(ids.cohost!)!.is_successor).toBe(false);
    expect(deps.participants.findById(ids.alice!)!.tier).toBe('co_host');
    expect(deps.participants.findById(ids.alice!)!.is_successor).toBe(true);

    // Room pointer
    expect(deps.rooms.findById(room_id)!.primary_host_id).toBe(ids.cohost);

    // Event log — exactly 4 role events, in order, all with actor=null
    const events = listRoleEvents(db, room_id);
    expect(events).toEqual([
      { actor: null, op: 'demote', target: ids.ph, from_tier: 'primary_host', to_tier: 'participant' },
      { actor: null, op: 'promote', target: ids.cohost, from_tier: 'co_host', to_tier: 'primary_host' },
      { actor: null, op: 'promote', target: ids.alice, from_tier: 'participant', to_tier: 'co_host' },
      { actor: null, op: 'nominate', target: ids.alice },
    ]);
  });

  it('PH + designated Co-Host + 0 Participants: co_host becomes PH; no new co_host; 2 role events', () => {
    const { room_id, ids } = seedRoom(deps, [
      { name: 'ph', tier: 'primary_host', connected: false },
      { name: 'cohost', tier: 'co_host', is_successor: true },
    ]);

    const outcome = performSuccession(deps, room_id);

    expect(outcome).toEqual({
      kind: 'succeeded',
      old_ph_id: ids.ph,
      new_ph_id: ids.cohost,
      new_co_host_id: null,
    });

    expect(deps.participants.findById(ids.cohost!)!.tier).toBe('primary_host');
    expect(deps.participants.findById(ids.cohost!)!.is_successor).toBe(false);
    expect(deps.rooms.findById(room_id)!.primary_host_id).toBe(ids.cohost);

    const events = listRoleEvents(db, room_id);
    expect(events.length).toBe(2);
    expect(events.map((e) => e.op)).toEqual(['demote', 'promote']);
  });

  it('earliestConnectedParticipant skips disconnected members; returns the oldest still connected', () => {
    const { room_id, ids } = seedRoom(deps, [
      { name: 'ph', tier: 'primary_host', connected: false },
      { name: 'cohost', tier: 'co_host', is_successor: true },
      { name: 'alice', tier: 'participant', connected: false },
      { name: 'bob', tier: 'participant', connected: true },
    ]);

    const outcome = performSuccession(deps, room_id);

    expect(outcome).toMatchObject({
      kind: 'succeeded',
      new_co_host_id: ids.bob,
    });
    expect(deps.participants.findById(ids.bob!)!.tier).toBe('co_host');
    expect(deps.participants.findById(ids.alice!)!.tier).toBe('participant');
  });

  it('no designated successor: returns no_successor with reason, no mutations, no events', () => {
    const { room_id, ids } = seedRoom(deps, [
      { name: 'ph', tier: 'primary_host' },
      { name: 'alice', tier: 'participant' }, // no successor flag anywhere
    ]);

    const outcome = performSuccession(deps, room_id);

    expect(outcome).toEqual({
      kind: 'no_successor',
      reason: 'no_designated_successor',
    });

    // PH tier untouched; rooms.primary_host_id untouched
    expect(deps.participants.findById(ids.ph!)!.tier).toBe('primary_host');
    expect(deps.participants.findById(ids.alice!)!.tier).toBe('participant');
    expect(deps.rooms.findById(room_id)!.primary_host_id).toBe(ids.ph);

    // No role events emitted
    expect(listRoleEvents(db, room_id)).toEqual([]);
  });

  it('unknown room: returns no_successor(unknown_room), no mutations', () => {
    const outcome = performSuccession(deps, 'no-such-room');
    expect(outcome).toEqual({
      kind: 'no_successor',
      reason: 'unknown_room',
    });
  });

  it('atomicity: if sessionEvents.append throws mid-chain, all tier mutations roll back', () => {
    const { room_id, ids } = seedRoom(deps, [
      { name: 'ph', tier: 'primary_host' },
      { name: 'cohost', tier: 'co_host', is_successor: true },
      { name: 'alice', tier: 'participant' },
    ]);

    let callCount = 0;
    const original = deps.sessionEvents.append.bind(deps.sessionEvents);
    deps.sessionEvents.append = (input) => {
      callCount += 1;
      if (callCount === 2) {
        // Throw after the first event (demote old PH) has been appended —
        // forces the whole tx to roll back, including the demote row.
        throw new Error('simulated append failure');
      }
      return original(input);
    };

    expect(() => performSuccession(deps, room_id)).toThrow('simulated append failure');

    // ALL mutations rolled back
    expect(deps.participants.findById(ids.ph!)!.tier).toBe('primary_host');
    expect(deps.participants.findById(ids.cohost!)!.tier).toBe('co_host');
    expect(deps.participants.findById(ids.cohost!)!.is_successor).toBe(true);
    expect(deps.participants.findById(ids.alice!)!.tier).toBe('participant');
    expect(deps.rooms.findById(room_id)!.primary_host_id).toBe(ids.ph);
    expect(listRoleEvents(db, room_id)).toEqual([]);
  });
});
