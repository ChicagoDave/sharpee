/**
 * handleDemote unit tests.
 *
 * Behavior Statement — handleDemote
 *   DOES:
 *     - When sender is primary_host, not muted, and target is in the same
 *       room at a strictly higher tier than to_tier (and is not the PH):
 *       calls setTier(target, to_tier, sender); clears is_successor iff the
 *       target was a successor being demoted below co_host; appends a
 *       role(demote) event with actor = sender and from/to tiers; broadcasts
 *       role_change to the room.
 *     - Otherwise: sends error to sender only — no state mutation, no event,
 *       no broadcast.
 *   WHEN: demote frame arrives on the post-hello dispatch path.
 *   BECAUSE: ADR-153 Decision 5 — PH-only demotion; Decision 11 — audited
 *            tier change; preserves the "successor is always a co_host"
 *            invariant.
 *   REJECTS WHEN:
 *     - target_participant_id missing/empty  → bad_target
 *     - to_tier not participant / command_entrant / co_host → bad_tier
 *     - sender unknown                        → unknown_participant
 *     - sender muted                          → muted
 *     - sender tier != primary_host           → insufficient_authority
 *     - target not in the same room           → unknown_target_participant
 *     - target is the primary_host            → cannot_demote_ph
 *     - target tier == to_tier                → same_tier
 *     - target tier < to_tier                 → invalid_demotion
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { handleDemote, type DemoteDeps } from '../../src/ws/handlers/demote.js';
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
  setTierCalls: Array<{ participant_id: string; tier: Tier; actor_id: string }>;
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
  const setTierCalls: Array<{ participant_id: string; tier: Tier; actor_id: string }> = [];
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
    setTier: (participant_id, tier, actor_id) => {
      setTierCalls.push({ participant_id, tier, actor_id });
      const existing = byId.get(participant_id);
      if (existing) byId.set(participant_id, { ...existing, tier });
    },
    setMuted: () => {},
    setConnected: () => {},
    setIsSuccessor: (participant_id, value) => {
      setIsSuccessorCalls.push({ participant_id, value });
      const existing = byId.get(participant_id);
      if (existing) byId.set(participant_id, { ...existing, is_successor: value });
    },
    listForRoom: () => [...byId.values()],
    earliestConnectedParticipant: () => null,
  };
  return { repo, setTierCalls, setIsSuccessorCalls, byId };
}

/* ---------- tests ---------- */

describe('handleDemote', () => {
  const ROOM = 'room-A';
  const OTHER_ROOM = 'room-B';
  const PH = 'ph-id';
  const COHOST = 'cohost-id';
  const COHOST_SUCCESSOR = 'cohost-successor-id';
  const ENTRANT = 'entrant-id';
  const ALICE = 'alice-id';
  const STRANGER = 'stranger-id'; // in OTHER_ROOM

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
      { participant_id: COHOST_SUCCESSOR, tier: 'co_host', is_successor: true },
      { participant_id: ENTRANT, tier: 'command_entrant' },
      { participant_id: ALICE, tier: 'participant' },
      { participant_id: 'muted-ph', tier: 'primary_host', muted: true },
      { participant_id: STRANGER, tier: 'co_host', room_id: OTHER_ROOM },
    ]);
    ws = fakeSocket();
  });

  function invoke(
    actorId: string,
    msg: Extract<ClientMsg, { kind: 'demote' }>
  ): void {
    const deps: DemoteDeps = {
      participants: participants.repo,
      sessionEvents: events.repo,
      connections: conns.mgr,
    };
    handleDemote(
      deps,
      ws as unknown as import('ws').WebSocket,
      { participant_id: actorId, room_id: ROOM },
      msg
    );
  }

  /* ---------- happy paths ---------- */

  it('PH demotes co_host → participant: tier set, event logged, role_change broadcast', () => {
    invoke(PH, { kind: 'demote', target_participant_id: COHOST, to_tier: 'participant' });

    expect(participants.setTierCalls).toEqual([
      { participant_id: COHOST, tier: 'participant', actor_id: PH },
    ]);
    expect(events.calls.length).toBe(1);
    expect(events.calls[0]!.participant_id).toBe(PH);
    expect(events.calls[0]!.payload).toEqual({
      kind: 'role',
      op: 'demote',
      target_participant_id: COHOST,
      from_tier: 'co_host',
      to_tier: 'participant',
    });
    expect(conns.calls).toEqual([
      {
        room_id: ROOM,
        msg: {
          kind: 'role_change',
          participant_id: COHOST,
          tier: 'participant',
          actor_id: PH,
        },
      },
    ]);
    expect(ws.sent).toEqual([]);
  });

  it('PH demotes co_host → command_entrant: allowed', () => {
    invoke(PH, { kind: 'demote', target_participant_id: COHOST, to_tier: 'command_entrant' });
    expect(participants.setTierCalls[0]!.tier).toBe('command_entrant');
    expect(events.calls[0]!.payload).toMatchObject({ to_tier: 'command_entrant' });
  });

  it('PH demotes command_entrant → participant: allowed', () => {
    invoke(PH, { kind: 'demote', target_participant_id: ENTRANT, to_tier: 'participant' });
    expect(participants.setTierCalls).toEqual([
      { participant_id: ENTRANT, tier: 'participant', actor_id: PH },
    ]);
  });

  /* ---------- successor-flag invariant ---------- */

  it('demoting a successor co_host below co_host clears is_successor', () => {
    invoke(PH, {
      kind: 'demote',
      target_participant_id: COHOST_SUCCESSOR,
      to_tier: 'participant',
    });

    expect(participants.setTierCalls[0]!.tier).toBe('participant');
    expect(participants.setIsSuccessorCalls).toEqual([
      { participant_id: COHOST_SUCCESSOR, value: false },
    ]);
    expect(participants.byId.get(COHOST_SUCCESSOR)!.is_successor).toBe(false);
  });

  it('demoting a non-successor co_host does NOT touch is_successor', () => {
    invoke(PH, { kind: 'demote', target_participant_id: COHOST, to_tier: 'participant' });
    expect(participants.setIsSuccessorCalls).toEqual([]);
  });

  /* ---------- authority rejections ---------- */

  it('Co-Host attempting demote: insufficient_authority; no mutation, no broadcast', () => {
    invoke(COHOST, { kind: 'demote', target_participant_id: ALICE, to_tier: 'participant' });

    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe(
      'insufficient_authority'
    );
    expect(participants.setTierCalls).toEqual([]);
    expect(events.calls).toEqual([]);
    expect(conns.calls).toEqual([]);
  });

  it('Command Entrant attempting demote: insufficient_authority', () => {
    invoke(ENTRANT, { kind: 'demote', target_participant_id: ALICE, to_tier: 'participant' });
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe(
      'insufficient_authority'
    );
  });

  it('Participant attempting demote: insufficient_authority', () => {
    invoke(ALICE, { kind: 'demote', target_participant_id: COHOST, to_tier: 'participant' });
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe(
      'insufficient_authority'
    );
  });

  /* ---------- validation rejections ---------- */

  it('bad_target when target_participant_id missing', () => {
    invoke(PH, { kind: 'demote', target_participant_id: '', to_tier: 'participant' });
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe('bad_target');
  });

  it('bad_tier when to_tier is primary_host', () => {
    invoke(PH, {
      kind: 'demote',
      target_participant_id: COHOST,
      // @ts-expect-error — wire type doesn't allow this but server must reject at runtime
      to_tier: 'primary_host',
    });
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe('bad_tier');
  });

  it('unknown_participant when sender not in repo', () => {
    invoke('ghost-id', {
      kind: 'demote',
      target_participant_id: COHOST,
      to_tier: 'participant',
    });
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe(
      'unknown_participant'
    );
  });

  it('muted sender: muted error', () => {
    invoke('muted-ph', {
      kind: 'demote',
      target_participant_id: COHOST,
      to_tier: 'participant',
    });
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe('muted');
  });

  /* ---------- target rejections ---------- */

  it('unknown_target_participant when target missing', () => {
    invoke(PH, {
      kind: 'demote',
      target_participant_id: 'no-such',
      to_tier: 'participant',
    });
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe(
      'unknown_target_participant'
    );
  });

  it('unknown_target_participant when target is in another room', () => {
    invoke(PH, {
      kind: 'demote',
      target_participant_id: STRANGER,
      to_tier: 'participant',
    });
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe(
      'unknown_target_participant'
    );
  });

  it('cannot_demote_ph when target is the primary_host', () => {
    invoke(PH, { kind: 'demote', target_participant_id: PH, to_tier: 'participant' });
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe(
      'cannot_demote_ph'
    );
    expect(participants.setTierCalls).toEqual([]);
  });

  it('same_tier when target already at to_tier', () => {
    invoke(PH, {
      kind: 'demote',
      target_participant_id: ALICE,
      to_tier: 'participant',
    });
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe('same_tier');
  });

  it('invalid_demotion when target is below to_tier (would be a promotion)', () => {
    invoke(PH, { kind: 'demote', target_participant_id: ALICE, to_tier: 'co_host' });
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe(
      'invalid_demotion'
    );
  });
});
