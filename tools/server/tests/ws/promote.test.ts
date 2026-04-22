/**
 * handlePromote unit tests.
 *
 * Behavior Statement — handlePromote
 *   DOES:
 *     - When the (sender_tier, to_tier) pair is authorised AND the target is
 *       in the same room AND currently at a lower tier: persists the new tier
 *       via participants.setTier, appends a role(promote) event with actor =
 *       sender and from/to tiers, and broadcasts role_change to the room.
 *     - Otherwise: sends an `error` frame to the sender only — no state
 *       mutation, no event row, no broadcast.
 *   WHEN: a promote frame arrives on the post-hello dispatch path.
 *   BECAUSE: ADR-153 Decision 5 — strict promotion authority matrix; Decision
 *            11 — tier change audit rows record actor and direction.
 *   REJECTS WHEN:
 *     - target_participant_id missing/empty  → bad_target
 *     - to_tier not co_host / command_entrant → bad_tier
 *     - sender unknown                        → unknown_participant
 *     - sender muted                          → muted
 *     - (sender_tier, to_tier) not authorised → insufficient_authority
 *     - target not in the same room           → unknown_target_participant
 *     - target already at to_tier             → same_tier
 *     - target tier > to_tier (demotion)      → invalid_promotion
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { handlePromote, type PromoteDeps } from '../../src/ws/handlers/promote.js';
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
  setTierCalls: Array<{ participant_id: string; tier: Tier; actor_id: string }>;
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
  const setTierCalls: Array<{ participant_id: string; tier: Tier; actor_id: string }> = [];
  const repo: ParticipantsRepository = {
    findById: (id) => byId.get(id) ?? null,
    createOrReconnect: () => {
      throw new Error('not used');
    },
    createWithId: () => {
      throw new Error('not used');
    },
    findByToken: () => null,
    setTier: (participant_id, tier, actor_id) => {
      setTierCalls.push({ participant_id, tier, actor_id });
      const existing = byId.get(participant_id);
      if (existing) byId.set(participant_id, { ...existing, tier });
    },
    setMuted: () => {},
    setConnected: () => {},
    setIsSuccessor: () => {},
    listForRoom: () => [...byId.values()],
    earliestConnectedParticipant: () => null,
  };
  return { repo, setTierCalls, byId };
}

/* ---------- tests ---------- */

describe('handlePromote', () => {
  const ROOM = 'room-A';
  const OTHER_ROOM = 'room-B';
  const PH = 'ph-id';
  const COHOST = 'cohost-id';
  const ENTRANT = 'entrant-id';
  const ALICE = 'alice-id';
  const BOB = 'bob-id';
  const STRANGER = 'stranger-id'; // lives in OTHER_ROOM

  let conns: ReturnType<typeof fakeConnections>;
  let events: ReturnType<typeof fakeSessionEvents>;
  let participants: FakeParticipantsState;
  let ws: FakeSocket;

  beforeEach(() => {
    conns = fakeConnections();
    events = fakeSessionEvents();
    participants = fakeParticipants([
      { participant_id: PH, tier: 'primary_host' },
      { participant_id: COHOST, tier: 'co_host' },
      { participant_id: ENTRANT, tier: 'command_entrant' },
      { participant_id: ALICE, tier: 'participant' },
      { participant_id: BOB, tier: 'participant' },
      { participant_id: 'muted-ph', tier: 'primary_host', muted: true },
      { participant_id: STRANGER, tier: 'participant', room_id: OTHER_ROOM },
    ]);
    ws = fakeSocket();
  });

  function invoke(
    actorId: string,
    msg: Extract<ClientMsg, { kind: 'promote' }>
  ): void {
    const deps: PromoteDeps = {
      participants: participants.repo,
      sessionEvents: events.repo,
      connections: conns.mgr,
    };
    handlePromote(
      deps,
      ws as unknown as import('ws').WebSocket,
      { participant_id: actorId, room_id: ROOM },
      msg
    );
  }

  /* ---------- authorised happy paths ---------- */

  it('PH promotes Participant → co_host: tier set, event logged, role_change broadcast', () => {
    invoke(PH, { kind: 'promote', target_participant_id: ALICE, to_tier: 'co_host' });

    expect(participants.setTierCalls).toEqual([
      { participant_id: ALICE, tier: 'co_host', actor_id: PH },
    ]);
    expect(events.calls.length).toBe(1);
    expect(events.calls[0]!.participant_id).toBe(PH);
    expect(events.calls[0]!.payload).toEqual({
      kind: 'role',
      op: 'promote',
      target_participant_id: ALICE,
      from_tier: 'participant',
      to_tier: 'co_host',
    });
    expect(conns.calls).toEqual([
      {
        room_id: ROOM,
        msg: {
          kind: 'role_change',
          participant_id: ALICE,
          tier: 'co_host',
          actor_id: PH,
        },
      },
    ]);
    expect(ws.sent).toEqual([]);
  });

  it('PH promotes Participant → command_entrant: allowed', () => {
    invoke(PH, { kind: 'promote', target_participant_id: ALICE, to_tier: 'command_entrant' });
    expect(participants.setTierCalls[0]!.tier).toBe('command_entrant');
    expect(events.calls[0]!.payload).toMatchObject({ to_tier: 'command_entrant' });
  });

  it('PH promotes command_entrant → co_host: allowed', () => {
    invoke(PH, { kind: 'promote', target_participant_id: ENTRANT, to_tier: 'co_host' });
    expect(participants.setTierCalls).toEqual([
      { participant_id: ENTRANT, tier: 'co_host', actor_id: PH },
    ]);
    expect(events.calls[0]!.payload).toMatchObject({
      from_tier: 'command_entrant',
      to_tier: 'co_host',
    });
  });

  it('Co-Host promotes Participant → command_entrant: allowed', () => {
    invoke(COHOST, {
      kind: 'promote',
      target_participant_id: ALICE,
      to_tier: 'command_entrant',
    });
    expect(participants.setTierCalls).toEqual([
      { participant_id: ALICE, tier: 'command_entrant', actor_id: COHOST },
    ]);
    expect(conns.calls[0]!.msg).toMatchObject({
      kind: 'role_change',
      tier: 'command_entrant',
      actor_id: COHOST,
    });
  });

  /* ---------- authority rejections ---------- */

  it('Co-Host attempting promote → co_host: insufficient_authority, no mutation, no broadcast', () => {
    invoke(COHOST, { kind: 'promote', target_participant_id: ALICE, to_tier: 'co_host' });

    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe(
      'insufficient_authority'
    );
    expect(participants.setTierCalls).toEqual([]);
    expect(events.calls).toEqual([]);
    expect(conns.calls).toEqual([]);
  });

  it('Command Entrant attempting any promotion: insufficient_authority', () => {
    invoke(ENTRANT, {
      kind: 'promote',
      target_participant_id: ALICE,
      to_tier: 'command_entrant',
    });
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe(
      'insufficient_authority'
    );
    expect(participants.setTierCalls).toEqual([]);
  });

  it('Participant attempting promotion: insufficient_authority', () => {
    invoke(ALICE, { kind: 'promote', target_participant_id: BOB, to_tier: 'command_entrant' });
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe(
      'insufficient_authority'
    );
  });

  /* ---------- validation rejections ---------- */

  it('bad_target: missing target_participant_id', () => {
    invoke(PH, {
      kind: 'promote',
      target_participant_id: '',
      to_tier: 'co_host',
    });
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe('bad_target');
    expect(participants.setTierCalls).toEqual([]);
  });

  it('bad_tier: to_tier other than co_host / command_entrant', () => {
    invoke(PH, {
      kind: 'promote',
      target_participant_id: ALICE,
      // @ts-expect-error — intentionally violating the type to test runtime rejection
      to_tier: 'primary_host',
    });
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe('bad_tier');
  });

  it('unknown_participant: sender not in repo', () => {
    invoke('ghost-id', {
      kind: 'promote',
      target_participant_id: ALICE,
      to_tier: 'co_host',
    });
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe(
      'unknown_participant'
    );
  });

  it('muted sender: muted error', () => {
    invoke('muted-ph', {
      kind: 'promote',
      target_participant_id: ALICE,
      to_tier: 'co_host',
    });
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe('muted');
  });

  /* ---------- target rejections ---------- */

  it('unknown_target_participant: target not in repo', () => {
    invoke(PH, {
      kind: 'promote',
      target_participant_id: 'no-such',
      to_tier: 'co_host',
    });
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe(
      'unknown_target_participant'
    );
  });

  it('unknown_target_participant: target exists but belongs to a different room', () => {
    invoke(PH, {
      kind: 'promote',
      target_participant_id: STRANGER,
      to_tier: 'co_host',
    });
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe(
      'unknown_target_participant'
    );
    expect(participants.setTierCalls).toEqual([]);
  });

  it('same_tier: target already at to_tier', () => {
    invoke(PH, { kind: 'promote', target_participant_id: COHOST, to_tier: 'co_host' });
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe('same_tier');
    expect(participants.setTierCalls).toEqual([]);
  });

  it('invalid_promotion: target currently higher than to_tier (should use demote)', () => {
    invoke(PH, {
      kind: 'promote',
      target_participant_id: COHOST,
      to_tier: 'command_entrant',
    });
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe(
      'invalid_promotion'
    );
    expect(participants.setTierCalls).toEqual([]);
  });
});
