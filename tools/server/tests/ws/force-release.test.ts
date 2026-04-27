/**
 * handleForceRelease unit tests.
 *
 * Behavior Statement — handleForceRelease
 *   DOES:
 *     - When sender tier ∈ {co_host, primary_host} AND target_participant_id
 *       equals the current lock holder: force-releases the lock (state →
 *       holder_id=null), appends role(force_release) with actor=sender and
 *       target=prior holder, broadcasts lock_state(null).
 *     - Otherwise: sends an `error` frame to sender only — no state mutation,
 *       no broadcast, no event row.
 *   WHEN: a force_release frame arrives on the post-hello dispatch path.
 *   BECAUSE: ADR-153 Decision 7 — Co-Hosts may wrest control from an
 *            unresponsive holder; every such action leaves an actor→target
 *            audit trail.
 *   REJECTS WHEN:
 *     - target_participant_id missing/empty → bad_target
 *     - sender unknown                      → unknown_participant
 *     - sender muted                        → muted
 *     - sender tier = participant           → insufficient_authority
 *     - holder null or ≠ target             → not_holder
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { handleForceRelease } from '../../src/ws/handlers/force-release.js';
import { createLockManager, type LockManager } from '../../src/ws/lock-manager.js';
import type { ConnectionManager } from '../../src/ws/connection-manager.js';
import type { ParticipantsRepository } from '../../src/repositories/participants.js';
import type { SessionEventsRepository } from '../../src/repositories/session-events.js';
import type {
  Participant,
  Tier,
  EventKind,
  EventPayload,
} from '../../src/repositories/types.js';
import type { ClientMsg, ServerMsg } from '../../src/wire/browser-server.js';

/* ---------- fakes ---------- */

interface FakeSocket {
  sent: ServerMsg[];
  send(data: string): void;
}

function fakeSocket(): FakeSocket {
  const sent: ServerMsg[] = [];
  return {
    sent,
    send(data: string) {
      sent.push(JSON.parse(data) as ServerMsg);
    },
  };
}

interface BroadcastCall {
  room_id: string;
  msg: ServerMsg;
}

function fakeConnections(): { mgr: ConnectionManager; calls: BroadcastCall[] } {
  const calls: BroadcastCall[] = [];
  const mgr: ConnectionManager = {
    register: () => {},
    unregisterParticipant: () => null,
    unregisterSocket: () => null,
    broadcast: (room_id, msg) => {
      calls.push({ room_id, msg });
    },
    send: () => false,
    closeRoom: () => 0,
    getConnectedCount: () => 0,
    getParticipantSocket: () => null,
    getSocketMeta: () => null,
    size: () => 0,
  };
  return { mgr, calls };
}

interface AppendCall {
  room_id: string;
  participant_id: string | null;
  kind: EventKind;
  payload: EventPayload;
}

function fakeSessionEvents(): { repo: SessionEventsRepository; calls: AppendCall[] } {
  const calls: AppendCall[] = [];
  let nextId = 1;
  const repo: SessionEventsRepository = {
    append: (input) => {
      calls.push({ ...input });
      return nextId++;
    },
    listForRoom: () => [],
  };
  return { repo, calls };
}

function fakeParticipants(
  entries: Array<Partial<Participant> & { participant_id: string; tier: Tier }>
): ParticipantsRepository {
  const byId = new Map<string, Participant>();
  for (const e of entries) {
    byId.set(e.participant_id, {
      participant_id: e.participant_id,
      room_id: e.room_id ?? 'room-A',
      token: e.token ?? 'tok-' + e.participant_id,
      tier: e.tier,
      muted: e.muted ?? false,
      connected: e.connected ?? true,
      is_successor: e.is_successor ?? false,
      joined_at: e.joined_at ?? '2026-04-21T00:00:00Z',
    });
  }
  return {
    findById: (id) => byId.get(id) ?? null,
    createOrReconnect: () => {
      throw new Error('not used');
    },
    createWithId: () => {
      throw new Error('not used');
    },
    findByToken: () => null,
    setTier: () => {},
    setMuted: () => {},
    setConnected: () => {},
    listForRoom: () => [],
    earliestConnectedParticipant: () => null,
  };
}

/* ---------- tests ---------- */

describe('handleForceRelease', () => {
  const ROOM = 'room-A';
  const PH = 'ph-id';
  const COHOST = 'cohost-id';
  const ALICE = 'alice-id';
  const BOB = 'bob-id';

  let locks: LockManager;
  let conns: ReturnType<typeof fakeConnections>;
  let events: ReturnType<typeof fakeSessionEvents>;
  let participants: ParticipantsRepository;
  let ws: FakeSocket;

  beforeEach(() => {
    locks = createLockManager();
    conns = fakeConnections();
    events = fakeSessionEvents();
    participants = fakeParticipants([
      { participant_id: PH, tier: 'primary_host' },
      { participant_id: COHOST, tier: 'co_host' },
      { participant_id: ALICE, tier: 'participant' },
      { participant_id: BOB, tier: 'participant' },
    ]);
    ws = fakeSocket();
  });

  function invoke(
    actorId: string,
    msg: Extract<ClientMsg, { kind: 'force_release' }>
  ): void {
    handleForceRelease(
      {
        participants,
        sessionEvents: events.repo,
        connections: conns.mgr,
        locks,
      },
      ws as unknown as import('ws').WebSocket,
      { participant_id: actorId, room_id: ROOM },
      msg
    );
  }

  it('Co-Host force-releases current holder: lock cleared, role event appended, lock_state broadcast', () => {
    locks.acquireOrUpdate(ROOM, ALICE, 1);
    expect(locks.getState(ROOM).holder_id).toBe(ALICE);

    invoke(COHOST, { kind: 'force_release', target_participant_id: ALICE });

    expect(locks.getState(ROOM).holder_id).toBeNull();
    expect(conns.calls).toEqual([
      { room_id: ROOM, msg: { kind: 'lock_state', holder_id: null } },
    ]);
    expect(events.calls).toHaveLength(1);
    expect(events.calls[0]).toMatchObject({
      room_id: ROOM,
      participant_id: COHOST,
      kind: 'role',
      payload: { kind: 'role', op: 'force_release', target_participant_id: ALICE },
    });
    expect(ws.sent).toEqual([]); // no error to sender
  });

  it('Primary Host force-releases current holder (same effect as Co-Host)', () => {
    locks.acquireOrUpdate(ROOM, ALICE, 1);

    invoke(PH, { kind: 'force_release', target_participant_id: ALICE });

    expect(locks.getState(ROOM).holder_id).toBeNull();
    expect(conns.calls).toHaveLength(1);
    expect(events.calls).toHaveLength(1);
    expect(events.calls[0].participant_id).toBe(PH);
  });

  it('Participant tier attempts force_release → insufficient_authority, lock unchanged, no event row', () => {
    locks.acquireOrUpdate(ROOM, ALICE, 1);

    invoke(BOB, { kind: 'force_release', target_participant_id: ALICE });

    expect(locks.getState(ROOM).holder_id).toBe(ALICE); // unchanged
    expect(conns.calls).toEqual([]);
    expect(events.calls).toEqual([]);
    expect(ws.sent).toHaveLength(1);
    expect(ws.sent[0]).toMatchObject({ kind: 'error', code: 'insufficient_authority' });
  });

  it('target_participant_id is an empty string → bad_target, lock unchanged', () => {
    locks.acquireOrUpdate(ROOM, ALICE, 1);

    invoke(COHOST, { kind: 'force_release', target_participant_id: '' });

    expect(locks.getState(ROOM).holder_id).toBe(ALICE);
    expect(conns.calls).toEqual([]);
    expect(events.calls).toEqual([]);
    expect(ws.sent[0]).toMatchObject({ kind: 'error', code: 'bad_target' });
  });

  it('target does not match current holder → not_holder, lock unchanged', () => {
    locks.acquireOrUpdate(ROOM, ALICE, 1);

    invoke(COHOST, { kind: 'force_release', target_participant_id: BOB });

    expect(locks.getState(ROOM).holder_id).toBe(ALICE);
    expect(conns.calls).toEqual([]);
    expect(events.calls).toEqual([]);
    expect(ws.sent[0]).toMatchObject({ kind: 'error', code: 'not_holder' });
  });

  it('no one holds the lock → not_holder', () => {
    expect(locks.getState(ROOM).holder_id).toBeNull();

    invoke(COHOST, { kind: 'force_release', target_participant_id: ALICE });

    expect(locks.getState(ROOM).holder_id).toBeNull();
    expect(conns.calls).toEqual([]);
    expect(events.calls).toEqual([]);
    expect(ws.sent[0]).toMatchObject({ kind: 'error', code: 'not_holder' });
  });

  it('sender no longer exists → unknown_participant', () => {
    locks.acquireOrUpdate(ROOM, ALICE, 1);

    invoke('ghost-id', { kind: 'force_release', target_participant_id: ALICE });

    expect(locks.getState(ROOM).holder_id).toBe(ALICE);
    expect(events.calls).toEqual([]);
    expect(ws.sent[0]).toMatchObject({ kind: 'error', code: 'unknown_participant' });
  });

  it('muted sender (even if Co-Host) → muted', () => {
    // Override COHOST to be muted.
    participants = fakeParticipants([
      { participant_id: COHOST, tier: 'co_host', muted: true },
      { participant_id: ALICE, tier: 'participant' },
    ]);
    locks.acquireOrUpdate(ROOM, ALICE, 1);

    invoke(COHOST, { kind: 'force_release', target_participant_id: ALICE });

    expect(locks.getState(ROOM).holder_id).toBe(ALICE);
    expect(events.calls).toEqual([]);
    expect(ws.sent[0]).toMatchObject({ kind: 'error', code: 'muted' });
  });
});
