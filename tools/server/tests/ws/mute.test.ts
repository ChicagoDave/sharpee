/**
 * handleMute unit tests.
 *
 * Behavior Statement — handleMute
 *   DOES: when actor's tier authorises muting target's tier and target is
 *         currently unmuted:
 *           - setMuted(target, true, actor) is called
 *           - session_events(role, op='mute', target, from_tier) appended
 *           - mute_state{target, muted:true, actor} broadcast to the room
 *   WHEN: a `mute` frame arrives on the post-hello dispatch path.
 *   BECAUSE: ADR-153 Decision 9 — mute is the only moderation action;
 *            every invocation leaves an actor→target audit trail.
 *   REJECTS WHEN:
 *     - target_participant_id missing               → bad_target
 *     - sender unknown                              → unknown_participant
 *     - target not in room                          → unknown_target_participant
 *     - co_host actor mutes another co_host         → insufficient_authority
 *     - participant / command_entrant actor         → insufficient_authority
 *     - target already muted                        → already_muted (no DB, no broadcast)
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { handleMute } from '../../src/ws/handlers/mute.js';
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
  let nextId = 300;
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
      display_name: e.display_name ?? e.participant_id,
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

describe('handleMute', () => {
  const ROOM = 'room-A';
  const OTHER_ROOM = 'room-B';
  const PH = 'ph-id';
  const COHOST_1 = 'co1-id';
  const COHOST_2 = 'co2-id';
  const CMD = 'cmd-id';
  const ALICE = 'alice-id';
  const FOREIGN = 'foreign-id';

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
      { participant_id: COHOST_2, tier: 'co_host' },
      { participant_id: CMD, tier: 'command_entrant' },
      { participant_id: ALICE, tier: 'participant' },
      { participant_id: FOREIGN, tier: 'participant', room_id: OTHER_ROOM },
    ]);
    ws = fakeSocket();
  });

  function invoke(
    actorId: string,
    msg: Extract<ClientMsg, { kind: 'mute' }>
  ): void {
    handleMute(
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

  it('PH mutes Participant: DB updated, role event logged, mute_state broadcast', () => {
    invoke(PH, { kind: 'mute', target_participant_id: ALICE });

    // DB mutation
    expect(participants.setMutedCalls).toEqual([
      { participant_id: ALICE, muted: true, actor_id: PH },
    ]);
    // Event row
    expect(events.calls).toHaveLength(1);
    expect(events.calls[0]).toMatchObject({
      room_id: ROOM,
      participant_id: PH,
      kind: 'role',
      payload: {
        kind: 'role',
        op: 'mute',
        target_participant_id: ALICE,
        from_tier: 'participant',
      },
    });
    // Broadcast
    expect(conns.calls).toEqual([
      {
        room_id: ROOM,
        msg: {
          kind: 'mute_state',
          participant_id: ALICE,
          muted: true,
          actor_id: PH,
        },
      },
    ]);
    expect(ws.sent).toEqual([]);
  });

  it('PH mutes Co-Host: authorised', () => {
    invoke(PH, { kind: 'mute', target_participant_id: COHOST_1 });
    expect(participants.setMutedCalls).toHaveLength(1);
    expect(conns.calls).toHaveLength(1);
    expect(conns.calls[0]!.msg).toMatchObject({ participant_id: COHOST_1, muted: true });
  });

  it('Co-Host mutes Command Entrant: authorised', () => {
    invoke(COHOST_1, { kind: 'mute', target_participant_id: CMD });
    expect(participants.setMutedCalls).toEqual([
      { participant_id: CMD, muted: true, actor_id: COHOST_1 },
    ]);
    expect(events.calls).toHaveLength(1);
    expect(conns.calls).toHaveLength(1);
  });

  it('Co-Host mutes Participant: authorised', () => {
    invoke(COHOST_1, { kind: 'mute', target_participant_id: ALICE });
    expect(participants.setMutedCalls).toHaveLength(1);
    expect(conns.calls).toHaveLength(1);
  });

  it('Co-Host attempts to mute another Co-Host: insufficient_authority, no DB change', () => {
    invoke(COHOST_1, { kind: 'mute', target_participant_id: COHOST_2 });

    expect(ws.sent[0]).toMatchObject({ code: 'insufficient_authority' });
    expect(participants.setMutedCalls).toEqual([]);
    expect(events.calls).toEqual([]);
    expect(conns.calls).toEqual([]);
  });

  it('Co-Host attempts to mute PH: insufficient_authority', () => {
    invoke(COHOST_1, { kind: 'mute', target_participant_id: PH });
    expect(ws.sent[0]).toMatchObject({ code: 'insufficient_authority' });
    expect(participants.setMutedCalls).toEqual([]);
  });

  it('Participant attempts to mute anyone: insufficient_authority', () => {
    invoke(ALICE, { kind: 'mute', target_participant_id: CMD });
    expect(ws.sent[0]).toMatchObject({ code: 'insufficient_authority' });
    expect(participants.setMutedCalls).toEqual([]);
    expect(events.calls).toEqual([]);
  });

  it('command_entrant attempts to mute anyone: insufficient_authority', () => {
    invoke(CMD, { kind: 'mute', target_participant_id: ALICE });
    expect(ws.sent[0]).toMatchObject({ code: 'insufficient_authority' });
    expect(participants.setMutedCalls).toEqual([]);
  });

  it('PH attempts to self-mute: insufficient_authority (matrix excludes PH)', () => {
    invoke(PH, { kind: 'mute', target_participant_id: PH });
    expect(ws.sent[0]).toMatchObject({ code: 'insufficient_authority' });
    expect(participants.setMutedCalls).toEqual([]);
  });

  it('target already muted: already_muted, no DB change, no broadcast', () => {
    // Pre-mute ALICE
    participants.repo.setMuted(ALICE, true, PH);
    participants.setMutedCalls.length = 0;

    invoke(PH, { kind: 'mute', target_participant_id: ALICE });

    expect(ws.sent[0]).toMatchObject({ code: 'already_muted' });
    expect(participants.setMutedCalls).toEqual([]);
    expect(events.calls).toEqual([]);
    expect(conns.calls).toEqual([]);
  });

  it('target not in this room: unknown_target_participant', () => {
    invoke(PH, { kind: 'mute', target_participant_id: FOREIGN });
    expect(ws.sent[0]).toMatchObject({ code: 'unknown_target_participant' });
    expect(participants.setMutedCalls).toEqual([]);
  });

  it('target does not exist: unknown_target_participant', () => {
    invoke(PH, { kind: 'mute', target_participant_id: 'ghost' });
    expect(ws.sent[0]).toMatchObject({ code: 'unknown_target_participant' });
  });

  it('missing target id: bad_target', () => {
    invoke(PH, { kind: 'mute', target_participant_id: '' });
    expect(ws.sent[0]).toMatchObject({ code: 'bad_target' });
    expect(participants.setMutedCalls).toEqual([]);
  });

  it('sender unknown: unknown_participant', () => {
    invoke('ghost', { kind: 'mute', target_participant_id: ALICE });
    expect(ws.sent[0]).toMatchObject({ code: 'unknown_participant' });
    expect(participants.setMutedCalls).toEqual([]);
  });

  it('muted PH can still mute (Decision 9: muted keeps role authority)', () => {
    // Pre-mute PH via a direct repo call to simulate a prior mute.
    participants.repo.setMuted(PH, true, COHOST_1);
    participants.setMutedCalls.length = 0;

    invoke(PH, { kind: 'mute', target_participant_id: ALICE });

    expect(participants.setMutedCalls).toEqual([
      { participant_id: ALICE, muted: true, actor_id: PH },
    ]);
    expect(conns.calls).toHaveLength(1);
  });
});
