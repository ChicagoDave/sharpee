/**
 * handleNominateSuccessor unit tests.
 *
 * Behavior Statement — handleNominateSuccessor
 *   DOES:
 *     - When sender is primary_host AND target is a co_host in the same room
 *       AND target is not already the successor: in one transaction, clears
 *       the prior successor's flag (if any) and sets target's is_successor
 *       to 1; appends role(nominate) event with actor = sender; broadcasts
 *       successor push to the room.
 *     - Otherwise: sends error to sender only — no state mutation, no event,
 *       no broadcast.
 *   WHEN: nominate_successor frame arrives on the post-hello dispatch path.
 *   BECAUSE: ADR-153 Decision 6 — exactly one successor per room; PH
 *            designates; successor must be a Co-Host.
 *   REJECTS WHEN:
 *     - target_participant_id missing/empty       → bad_target
 *     - sender unknown                             → unknown_participant
 *     - sender muted                               → muted
 *     - sender tier != primary_host               → insufficient_authority
 *     - target not in the same room                → unknown_target_participant
 *     - target tier != co_host                     → not_co_host
 *     - target already has is_successor = 1        → already_successor
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  handleNominateSuccessor,
  type NominateSuccessorDeps,
} from '../../src/ws/handlers/nominate-successor.js';
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

type FakeParticipantsState = {
  repo: ParticipantsRepository;
  setIsSuccessorCalls: Array<{ participant_id: string; value: boolean }>;
  byId: Map<string, Participant>;
};

function fakeParticipants(
  entries: Array<Partial<Participant> & { participant_id: string; tier: Tier }>
): FakeParticipantsState {
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
  const setIsSuccessorCalls: Array<{ participant_id: string; value: boolean }> = [];
  const repo: ParticipantsRepository = {
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
    setIsSuccessor: (participant_id, value) => {
      setIsSuccessorCalls.push({ participant_id, value });
      const existing = byId.get(participant_id);
      if (existing) byId.set(participant_id, { ...existing, is_successor: value });
    },
    listForRoom: (room_id) =>
      [...byId.values()].filter((p) => p.room_id === room_id),
    earliestConnectedParticipant: () => null,
  };
  return { repo, setIsSuccessorCalls, byId };
}

/** Minimal Database stub — only `.transaction(fn)` is used. */
function fakeDb(): NominateSuccessorDeps['db'] {
  return {
    transaction: (fn: () => void) => (() => fn()),
  } as unknown as NominateSuccessorDeps['db'];
}

/* ---------- tests ---------- */

describe('handleNominateSuccessor', () => {
  const ROOM = 'room-A';
  const OTHER_ROOM = 'room-B';
  const PH = 'ph-id';
  const COHOST_A = 'cohost-a';
  const COHOST_B = 'cohost-b';
  const COHOST_SUCCESSOR = 'cohost-successor';
  const ENTRANT = 'entrant-id';
  const ALICE = 'alice-id';
  const STRANGER = 'stranger-id';

  let conns: ReturnType<typeof fakeConnections>;
  let events: ReturnType<typeof fakeSessionEvents>;
  let participants: FakeParticipantsState;
  let ws: FakeSocket;
  let db: NominateSuccessorDeps['db'];

  beforeEach(() => {
    conns = fakeConnections();
    events = fakeSessionEvents();
    participants = fakeParticipants([
      { participant_id: PH, tier: 'primary_host' },
      { participant_id: COHOST_A, tier: 'co_host' },
      { participant_id: COHOST_B, tier: 'co_host' },
      { participant_id: COHOST_SUCCESSOR, tier: 'co_host', is_successor: true },
      { participant_id: ENTRANT, tier: 'command_entrant' },
      { participant_id: ALICE, tier: 'participant' },
      { participant_id: 'muted-ph', tier: 'primary_host', muted: true },
      { participant_id: STRANGER, tier: 'co_host', room_id: OTHER_ROOM },
    ]);
    ws = fakeSocket();
    db = fakeDb();
  });

  function invoke(
    actorId: string,
    msg: Extract<ClientMsg, { kind: 'nominate_successor' }>
  ): void {
    const deps: NominateSuccessorDeps = {
      db,
      participants: participants.repo,
      sessionEvents: events.repo,
      connections: conns.mgr,
    };
    handleNominateSuccessor(
      deps,
      ws as unknown as import('ws').WebSocket,
      { participant_id: actorId, room_id: ROOM },
      msg
    );
  }

  /* ---------- happy paths ---------- */

  it('nominates a co_host with no prior successor: flag set, event logged, successor broadcast', () => {
    // Clear the fixture's pre-existing successor for this case
    participants.repo.setIsSuccessor(COHOST_SUCCESSOR, false);
    participants.setIsSuccessorCalls.length = 0;

    invoke(PH, { kind: 'nominate_successor', target_participant_id: COHOST_A });

    expect(participants.setIsSuccessorCalls).toEqual([
      { participant_id: COHOST_A, value: true },
    ]);
    expect(participants.byId.get(COHOST_A)!.is_successor).toBe(true);

    expect(events.calls.length).toBe(1);
    expect(events.calls[0]!.participant_id).toBe(PH);
    expect(events.calls[0]!.payload).toEqual({
      kind: 'role',
      op: 'nominate',
      target_participant_id: COHOST_A,
    });

    expect(conns.calls).toEqual([
      {
        room_id: ROOM,
        msg: { kind: 'successor', participant_id: COHOST_A },
      },
    ]);
    expect(ws.sent).toEqual([]);
  });

  it('switching successor: prior successor is cleared, new one is set (one tx, one event)', () => {
    invoke(PH, { kind: 'nominate_successor', target_participant_id: COHOST_A });

    expect(participants.setIsSuccessorCalls).toEqual([
      { participant_id: COHOST_SUCCESSOR, value: false },
      { participant_id: COHOST_A, value: true },
    ]);
    expect(participants.byId.get(COHOST_SUCCESSOR)!.is_successor).toBe(false);
    expect(participants.byId.get(COHOST_A)!.is_successor).toBe(true);

    expect(events.calls.length).toBe(1);
    expect(conns.calls[0]!.msg).toEqual({
      kind: 'successor',
      participant_id: COHOST_A,
    });
  });

  /* ---------- authority rejections ---------- */

  it('Co-Host attempting nominate: insufficient_authority; no mutation, no broadcast', () => {
    invoke(COHOST_A, { kind: 'nominate_successor', target_participant_id: COHOST_B });

    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe(
      'insufficient_authority'
    );
    expect(participants.setIsSuccessorCalls).toEqual([]);
    expect(events.calls).toEqual([]);
    expect(conns.calls).toEqual([]);
  });

  it('Command Entrant attempting nominate: insufficient_authority', () => {
    invoke(ENTRANT, { kind: 'nominate_successor', target_participant_id: COHOST_A });
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe(
      'insufficient_authority'
    );
  });

  it('Participant attempting nominate: insufficient_authority', () => {
    invoke(ALICE, { kind: 'nominate_successor', target_participant_id: COHOST_A });
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe(
      'insufficient_authority'
    );
  });

  /* ---------- validation rejections ---------- */

  it('bad_target when target_participant_id missing', () => {
    invoke(PH, { kind: 'nominate_successor', target_participant_id: '' });
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe('bad_target');
  });

  it('unknown_participant when sender not in repo', () => {
    invoke('ghost-id', { kind: 'nominate_successor', target_participant_id: COHOST_A });
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe(
      'unknown_participant'
    );
  });

  it('muted sender: muted error', () => {
    invoke('muted-ph', { kind: 'nominate_successor', target_participant_id: COHOST_A });
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe('muted');
  });

  /* ---------- target rejections ---------- */

  it('unknown_target_participant when target missing', () => {
    invoke(PH, { kind: 'nominate_successor', target_participant_id: 'no-such' });
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe(
      'unknown_target_participant'
    );
  });

  it('unknown_target_participant when target is in another room', () => {
    invoke(PH, { kind: 'nominate_successor', target_participant_id: STRANGER });
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe(
      'unknown_target_participant'
    );
  });

  it('not_co_host when target is a command_entrant', () => {
    invoke(PH, { kind: 'nominate_successor', target_participant_id: ENTRANT });
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe('not_co_host');
  });

  it('not_co_host when target is a participant', () => {
    invoke(PH, { kind: 'nominate_successor', target_participant_id: ALICE });
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe('not_co_host');
  });

  it('already_successor when target already has the flag', () => {
    invoke(PH, {
      kind: 'nominate_successor',
      target_participant_id: COHOST_SUCCESSOR,
    });
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe(
      'already_successor'
    );
    expect(participants.setIsSuccessorCalls).toEqual([]);
    expect(events.calls).toEqual([]);
    expect(conns.calls).toEqual([]);
  });
});
