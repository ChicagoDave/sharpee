/**
 * handleDraftDelta unit tests.
 *
 * Behavior Statement — handleDraftDelta
 *   DOES:
 *     - Empty text by current holder → releases lock, broadcasts
 *       lock_state(null).
 *     - Empty text by any other sender → silent no-op (no mutation, no
 *       broadcast, no error).
 *     - Non-empty text on a free lock → acquires for sender (holder_id =
 *       sender), broadcasts lock_state(sender) then broadcasts draft_frame.
 *     - Non-empty text by current holder with seq > stored → broadcasts
 *       draft_frame (no additional lock_state).
 *     - Non-empty text by current holder with seq ≤ stored (N-7 out-of-order)
 *       → silently swallowed (no draft_frame, no lock_state).
 *     - Non-empty text while a different participant holds → sends
 *       lock_state(existing_holder) to the sender only; no broadcast, no
 *       mutation. This is the B-1 race path.
 *   WHEN: a draft_delta frame arrives post-hello.
 *   BECAUSE: ADR-153 Decision 7 — live preview via draft_frame, with
 *            first-keystroke lock acquisition.
 *   REJECTS WHEN:
 *     - seq is not a non-negative finite number → bad_seq
 *     - text is not a string                    → bad_text
 *     - sender unknown                          → unknown_participant
 *     - sender muted                            → muted
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { handleDraftDelta } from '../../src/ws/handlers/draft-delta.js';
import { createLockManager, type LockManager } from '../../src/ws/lock-manager.js';
import type { ConnectionManager } from '../../src/ws/connection-manager.js';
import type { ParticipantsRepository } from '../../src/repositories/participants.js';
import type { Participant, Tier } from '../../src/repositories/types.js';
import type { ClientMsg, ServerMsg } from '../../src/wire/browser-server.js';

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

function fakeParticipants(
  entries: Array<Partial<Participant> & { participant_id: string; tier: Tier }>
): ParticipantsRepository {
  const byId = new Map<string, Participant>();
  for (const e of entries) {
    byId.set(e.participant_id, {
      participant_id: e.participant_id,
      room_id: e.room_id ?? 'room-A',
      token: e.token ?? 'tok-' + e.participant_id,
      display_name: e.display_name ?? e.participant_id,
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

describe('handleDraftDelta', () => {
  const ROOM = 'room-A';
  const ALICE = 'alice-id';
  const BOB = 'bob-id';

  let locks: LockManager;
  let conns: ReturnType<typeof fakeConnections>;
  let participants: ParticipantsRepository;
  let ws: FakeSocket;

  beforeEach(() => {
    locks = createLockManager();
    conns = fakeConnections();
    participants = fakeParticipants([
      { participant_id: ALICE, tier: 'participant' },
      { participant_id: BOB, tier: 'participant' },
    ]);
    ws = fakeSocket();
  });

  function invoke(
    actorId: string,
    msg: Extract<ClientMsg, { kind: 'draft_delta' }>,
    socket: FakeSocket = ws
  ): void {
    handleDraftDelta(
      {
        participants,
        connections: conns.mgr,
        locks,
      },
      socket as unknown as import('ws').WebSocket,
      { participant_id: actorId, room_id: ROOM },
      msg
    );
  }

  it('first draft_delta on a free room acquires the lock and broadcasts lock_state then draft_frame', () => {
    invoke(ALICE, { kind: 'draft_delta', seq: 1, text: 'l' });

    expect(locks.getState(ROOM).holder_id).toBe(ALICE);
    expect(locks.getState(ROOM).draft_seq).toBe(1);

    expect(conns.calls).toEqual([
      { room_id: ROOM, msg: { kind: 'lock_state', holder_id: ALICE } },
      { room_id: ROOM, msg: { kind: 'draft_frame', typist_id: ALICE, seq: 1, text: 'l' } },
    ]);
    expect(ws.sent).toEqual([]); // no sender-only frames on success path
  });

  it('B-1 race: second client sending draft_delta while Alice holds sees lock_state(Alice) on own socket only', () => {
    // Alice typed first.
    invoke(ALICE, { kind: 'draft_delta', seq: 1, text: 'l' });
    const broadcastsAfterAlice = conns.calls.length;

    // Bob tries to type.
    const bobSock = fakeSocket();
    invoke(BOB, { kind: 'draft_delta', seq: 1, text: 'x' }, bobSock);

    // Lock still held by Alice — no mutation.
    expect(locks.getState(ROOM).holder_id).toBe(ALICE);
    // No new broadcasts for Bob's attempt.
    expect(conns.calls).toHaveLength(broadcastsAfterAlice);
    // Bob's own socket got the current holder back.
    expect(bobSock.sent).toEqual([{ kind: 'lock_state', holder_id: ALICE }]);
  });

  it('holder continuing to type (newer seq) broadcasts draft_frame only (no extra lock_state)', () => {
    invoke(ALICE, { kind: 'draft_delta', seq: 1, text: 'l' });
    conns.calls.length = 0; // reset, test only what the next keystroke emits

    invoke(ALICE, { kind: 'draft_delta', seq: 2, text: 'lo' });

    expect(locks.getState(ROOM).holder_id).toBe(ALICE);
    expect(locks.getState(ROOM).draft_seq).toBe(2);
    expect(conns.calls).toEqual([
      { room_id: ROOM, msg: { kind: 'draft_frame', typist_id: ALICE, seq: 2, text: 'lo' } },
    ]);
  });

  it('out-of-order seq from holder (N-7) is silently swallowed: no draft_frame, draft_seq unchanged', () => {
    invoke(ALICE, { kind: 'draft_delta', seq: 5, text: 'hello' });
    conns.calls.length = 0;

    // Stale frame with seq=3 arriving after seq=5
    invoke(ALICE, { kind: 'draft_delta', seq: 3, text: 'hel' });

    expect(locks.getState(ROOM).draft_seq).toBe(5); // not rewound
    expect(conns.calls).toEqual([]);
    expect(ws.sent).toEqual([]);
  });

  it('empty text from the current holder releases the lock and broadcasts lock_state(null)', () => {
    invoke(ALICE, { kind: 'draft_delta', seq: 1, text: 'h' });
    conns.calls.length = 0;

    invoke(ALICE, { kind: 'draft_delta', seq: 2, text: '' });

    expect(locks.getState(ROOM).holder_id).toBeNull();
    expect(conns.calls).toEqual([
      { room_id: ROOM, msg: { kind: 'lock_state', holder_id: null } },
    ]);
  });

  it('empty text from a non-holder is a silent no-op (no broadcast, no mutation, no error)', () => {
    invoke(ALICE, { kind: 'draft_delta', seq: 1, text: 'h' });
    conns.calls.length = 0;

    const bobSock = fakeSocket();
    invoke(BOB, { kind: 'draft_delta', seq: 1, text: '' }, bobSock);

    expect(locks.getState(ROOM).holder_id).toBe(ALICE);
    expect(conns.calls).toEqual([]);
    expect(bobSock.sent).toEqual([]);
  });

  it('bad seq (negative) → bad_seq error to sender, lock unchanged', () => {
    invoke(ALICE, { kind: 'draft_delta', seq: -1, text: 'x' });

    expect(locks.getState(ROOM).holder_id).toBeNull();
    expect(conns.calls).toEqual([]);
    expect(ws.sent[0]).toMatchObject({ kind: 'error', code: 'bad_seq' });
  });

  it('bad text (not a string) → bad_text error to sender, lock unchanged', () => {
    // Force a runtime type violation the way a malformed frame would.
    invoke(ALICE, {
      kind: 'draft_delta',
      seq: 1,
      text: 42 as unknown as string,
    });

    expect(locks.getState(ROOM).holder_id).toBeNull();
    expect(conns.calls).toEqual([]);
    expect(ws.sent[0]).toMatchObject({ kind: 'error', code: 'bad_text' });
  });

  it('unknown participant → unknown_participant, lock unchanged', () => {
    invoke('ghost-id', { kind: 'draft_delta', seq: 1, text: 'x' });

    expect(locks.getState(ROOM).holder_id).toBeNull();
    expect(conns.calls).toEqual([]);
    expect(ws.sent[0]).toMatchObject({ kind: 'error', code: 'unknown_participant' });
  });

  it('muted sender → muted, lock unchanged', () => {
    participants = fakeParticipants([
      { participant_id: ALICE, tier: 'participant', muted: true },
    ]);

    invoke(ALICE, { kind: 'draft_delta', seq: 1, text: 'x' });

    expect(locks.getState(ROOM).holder_id).toBeNull();
    expect(conns.calls).toEqual([]);
    expect(ws.sent[0]).toMatchObject({ kind: 'error', code: 'muted' });
  });
});
