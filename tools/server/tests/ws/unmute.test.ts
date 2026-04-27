/**
 * handleUnmute unit tests.
 *
 * Behavior Statement — handleUnmute
 *   DOES: when actor is PH or Co-Host and target is currently muted:
 *           - setMuted(target, false, actor) is called
 *           - session_events(role, op='unmute', target, from_tier) appended
 *           - mute_state{target, muted:false, actor} broadcast to the room
 *   WHEN: an `unmute` frame arrives on the post-hello dispatch path.
 *   BECAUSE: ADR-153 Decision 9 — flat unmute authority lets a second
 *            moderator rescue a bad mute without tier gymnastics.
 *   REJECTS WHEN:
 *     - target_participant_id missing             → bad_target
 *     - sender unknown                            → unknown_participant
 *     - sender tier is CE or participant          → insufficient_authority
 *     - target not in room                        → unknown_target_participant
 *     - target not currently muted                → not_muted
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { handleUnmute } from '../../src/ws/handlers/unmute.js';
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

/* ---------- fakes (same shape as mute.test.ts) ---------- */

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
  let nextId = 400;
  const repo: SessionEventsRepository = {
    append: (input) => {
      calls.push({
        room_id: input.room_id,
        participant_id: input.participant_id,
        kind: input.kind,
        payload: input.payload,
      });
      return nextId++;
    },
    listForRoom: () => [],
  };
  return { repo, calls };
}

interface SetMutedCall {
  participant_id: string;
  muted: boolean;
  actor_id: string;
}

function fakeParticipants(
  entries: Array<Partial<Participant> & { participant_id: string; tier: Tier }>
): { repo: ParticipantsRepository; setMutedCalls: SetMutedCall[] } {
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
  const setMutedCalls: SetMutedCall[] = [];
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
    setMuted: (participant_id, muted, actor_id) => {
      setMutedCalls.push({ participant_id, muted, actor_id });
      const p = byId.get(participant_id);
      if (p) p.muted = muted;
    },
    setConnected: () => {},
    setIsSuccessor: () => {},
    listForRoom: () => [],
    earliestConnectedParticipant: () => null,
  };
  return { repo, setMutedCalls };
}

/* ---------- tests ---------- */

describe('handleUnmute', () => {
  const ROOM = 'room-A';
  const OTHER_ROOM = 'room-B';
  const PH = 'ph-id';
  const COHOST_1 = 'co1-id';
  const COHOST_2 = 'co2-id';
  const CMD = 'cmd-id';
  const ALICE_MUTED = 'alice-id';
  const BOB_UNMUTED = 'bob-id';
  const FOREIGN_MUTED = 'foreign-id';

  let conns: ReturnType<typeof fakeConnections>;
  let events: ReturnType<typeof fakeSessionEvents>;
  let participants: ReturnType<typeof fakeParticipants>;
  let ws: FakeSocket;

  beforeEach(() => {
    conns = fakeConnections();
    events = fakeSessionEvents();
    participants = fakeParticipants([
      { participant_id: PH, tier: 'primary_host' },
      { participant_id: COHOST_1, tier: 'co_host' },
      { participant_id: COHOST_2, tier: 'co_host', muted: true },
      { participant_id: CMD, tier: 'command_entrant' },
      { participant_id: ALICE_MUTED, tier: 'participant', muted: true },
      { participant_id: BOB_UNMUTED, tier: 'participant', muted: false },
      { participant_id: FOREIGN_MUTED, tier: 'participant', muted: true, room_id: OTHER_ROOM },
    ]);
    ws = fakeSocket();
  });

  function invoke(
    actorId: string,
    msg: Extract<ClientMsg, { kind: 'unmute' }>
  ): void {
    handleUnmute(
      {
        participants: participants.repo,
        sessionEvents: events.repo,
        connections: conns.mgr,
      },
      ws as unknown as import('ws').WebSocket,
      { participant_id: actorId, room_id: ROOM },
      msg
    );
  }

  it('PH unmutes Participant: DB updated, role event logged, mute_state broadcast', () => {
    invoke(PH, { kind: 'unmute', target_participant_id: ALICE_MUTED });

    expect(participants.setMutedCalls).toEqual([
      { participant_id: ALICE_MUTED, muted: false, actor_id: PH },
    ]);
    expect(events.calls).toHaveLength(1);
    expect(events.calls[0]).toMatchObject({
      room_id: ROOM,
      participant_id: PH,
      kind: 'role',
      payload: {
        kind: 'role',
        op: 'unmute',
        target_participant_id: ALICE_MUTED,
        from_tier: 'participant',
      },
    });
    expect(conns.calls).toEqual([
      {
        room_id: ROOM,
        msg: {
          kind: 'mute_state',
          participant_id: ALICE_MUTED,
          muted: false,
          actor_id: PH,
        },
      },
    ]);
    expect(ws.sent).toEqual([]);
  });

  it('Co-Host unmutes a Participant muted by a different moderator: flat authority', () => {
    invoke(COHOST_1, { kind: 'unmute', target_participant_id: ALICE_MUTED });

    expect(participants.setMutedCalls).toEqual([
      { participant_id: ALICE_MUTED, muted: false, actor_id: COHOST_1 },
    ]);
    expect(conns.calls).toHaveLength(1);
  });

  it('Co-Host unmutes another muted Co-Host: flat authority (asymmetric with mute)', () => {
    invoke(COHOST_1, { kind: 'unmute', target_participant_id: COHOST_2 });

    expect(participants.setMutedCalls).toEqual([
      { participant_id: COHOST_2, muted: false, actor_id: COHOST_1 },
    ]);
    expect(conns.calls).toHaveLength(1);
  });

  it('Participant attempts unmute: insufficient_authority, no DB change', () => {
    invoke(BOB_UNMUTED, { kind: 'unmute', target_participant_id: ALICE_MUTED });

    expect(ws.sent[0]).toMatchObject({ code: 'insufficient_authority' });
    expect(participants.setMutedCalls).toEqual([]);
    expect(events.calls).toEqual([]);
    expect(conns.calls).toEqual([]);
  });

  it('command_entrant attempts unmute: insufficient_authority', () => {
    invoke(CMD, { kind: 'unmute', target_participant_id: ALICE_MUTED });
    expect(ws.sent[0]).toMatchObject({ code: 'insufficient_authority' });
    expect(participants.setMutedCalls).toEqual([]);
  });

  it('target not muted: not_muted, no DB change, no broadcast', () => {
    invoke(PH, { kind: 'unmute', target_participant_id: BOB_UNMUTED });

    expect(ws.sent[0]).toMatchObject({ code: 'not_muted' });
    expect(participants.setMutedCalls).toEqual([]);
    expect(events.calls).toEqual([]);
    expect(conns.calls).toEqual([]);
  });

  it('target in different room: unknown_target_participant', () => {
    invoke(PH, { kind: 'unmute', target_participant_id: FOREIGN_MUTED });
    expect(ws.sent[0]).toMatchObject({ code: 'unknown_target_participant' });
    expect(participants.setMutedCalls).toEqual([]);
  });

  it('target does not exist: unknown_target_participant', () => {
    invoke(PH, { kind: 'unmute', target_participant_id: 'ghost' });
    expect(ws.sent[0]).toMatchObject({ code: 'unknown_target_participant' });
  });

  it('missing target id: bad_target', () => {
    invoke(PH, { kind: 'unmute', target_participant_id: '' });
    expect(ws.sent[0]).toMatchObject({ code: 'bad_target' });
    expect(participants.setMutedCalls).toEqual([]);
  });

  it('sender unknown: unknown_participant', () => {
    invoke('ghost', { kind: 'unmute', target_participant_id: ALICE_MUTED });
    expect(ws.sent[0]).toMatchObject({ code: 'unknown_participant' });
    expect(participants.setMutedCalls).toEqual([]);
  });

  it('muted Co-Host can still unmute (Decision 9: muted keeps role authority)', () => {
    invoke(COHOST_2, { kind: 'unmute', target_participant_id: ALICE_MUTED });

    expect(participants.setMutedCalls).toEqual([
      { participant_id: ALICE_MUTED, muted: false, actor_id: COHOST_2 },
    ]);
    expect(conns.calls).toHaveLength(1);
  });
});
