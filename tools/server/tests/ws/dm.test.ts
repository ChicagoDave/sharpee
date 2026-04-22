/**
 * handleDm unit tests.
 *
 * Behavior Statement — handleDm
 *   DOES:
 *     - Appends session_events{kind:'dm', payload:{kind:'dm', to_participant_id, text}}
 *       with sender as participant_id; reads back the assigned event_id.
 *     - Bumps rooms.last_activity_at to the same ts.
 *     - Delivers dm{event_id, from, to, text, ts} to the sender's socket AND the
 *       recipient's socket only — no broadcast to other participants.
 *   WHEN: a dm frame arrives on the post-hello dispatch path.
 *   BECAUSE: ADR-153 Decision 8 (private PH↔Co-Host channel); Decision 11
 *            (DMs persisted with cascade-delete on room delete).
 *   REJECTS WHEN:
 *     - text empty/whitespace       → error 'empty_dm'; no event; no delivery
 *     - to_participant_id missing   → error 'bad_target'
 *     - sender unknown              → error 'unknown_participant'
 *     - sender muted                → error 'muted'
 *     - recipient unknown / foreign → error 'recipient_not_found'
 *     - axis not PH↔Co-Host         → error 'dm_axis_violation'
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { handleDm } from '../../src/ws/handlers/dm.js';
import type { ConnectionManager } from '../../src/ws/connection-manager.js';
import type { ParticipantsRepository } from '../../src/repositories/participants.js';
import type { SessionEventsRepository } from '../../src/repositories/session-events.js';
import type { RoomsRepository } from '../../src/repositories/rooms.js';
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
  opts?: { except_participant_id?: string };
}

interface TargetedSendCall {
  participant_id: string;
  msg: ServerMsg;
}

function fakeConnections(): {
  mgr: ConnectionManager;
  broadcasts: BroadcastCall[];
  sends: TargetedSendCall[];
} {
  const broadcasts: BroadcastCall[] = [];
  const sends: TargetedSendCall[] = [];
  const mgr: ConnectionManager = {
    register: () => {},
    unregisterParticipant: () => null,
    unregisterSocket: () => null,
    broadcast: (room_id, msg, opts) => {
      broadcasts.push({ room_id, msg, opts });
    },
    send: (participant_id, msg) => {
      sends.push({ participant_id, msg });
      return true;
    },
    closeRoom: () => 0,
    getConnectedCount: () => 0,
    getParticipantSocket: () => null,
    getSocketMeta: () => null,
    size: () => 0,
  };
  return { mgr, broadcasts, sends };
}

interface AppendCall {
  room_id: string;
  participant_id: string | null;
  kind: EventKind;
  payload: EventPayload;
  ts?: string;
}

function fakeSessionEvents(): { repo: SessionEventsRepository; calls: AppendCall[] } {
  const calls: AppendCall[] = [];
  let nextId = 200;
  const repo: SessionEventsRepository = {
    append: (input) => {
      calls.push({ ...input });
      return nextId++;
    },
    listForRoom: () => [],
  };
  return { repo, calls };
}

function fakeRooms(): {
  repo: RoomsRepository;
  activity: Array<{ room_id: string; ts: string }>;
} {
  const activity: Array<{ room_id: string; ts: string }> = [];
  const repo: RoomsRepository = {
    create: () => {
      throw new Error('not used');
    },
    findById: () => null,
    findByJoinCode: () => null,
    updateLastActivity: (room_id, ts) => {
      activity.push({ room_id, ts });
    },
    setPinned: () => {},
    updatePrimaryHost: () => {},
    delete: () => {},
    listRecycleCandidates: () => [],
  };
  return { repo, activity };
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
    setIsSuccessor: () => {},
    listForRoom: () => [],
    earliestConnectedParticipant: () => null,
  };
}

/* ---------- tests ---------- */

describe('handleDm', () => {
  const ROOM = 'room-A';
  const OTHER_ROOM = 'room-B';
  const PH = 'ph-id';
  const COHOST_1 = 'co1-id';
  const COHOST_2 = 'co2-id';
  const CMD = 'cmd-id';
  const ALICE = 'alice-id';
  const MUTED_CO = 'muted-co-id';
  const FOREIGN_CO = 'foreign-co-id';

  let conns: ReturnType<typeof fakeConnections>;
  let events: ReturnType<typeof fakeSessionEvents>;
  let rooms: ReturnType<typeof fakeRooms>;
  let participants: ParticipantsRepository;
  let ws: FakeSocket;

  beforeEach(() => {
    conns = fakeConnections();
    events = fakeSessionEvents();
    rooms = fakeRooms();
    participants = fakeParticipants([
      { participant_id: PH, tier: 'primary_host' },
      { participant_id: COHOST_1, tier: 'co_host' },
      { participant_id: COHOST_2, tier: 'co_host' },
      { participant_id: CMD, tier: 'command_entrant' },
      { participant_id: ALICE, tier: 'participant' },
      { participant_id: MUTED_CO, tier: 'co_host', muted: true },
      { participant_id: FOREIGN_CO, tier: 'co_host', room_id: OTHER_ROOM },
    ]);
    ws = fakeSocket();
  });

  function invoke(
    actorId: string,
    msg: Extract<ClientMsg, { kind: 'dm' }>
  ): void {
    handleDm(
      {
        participants,
        sessionEvents: events.repo,
        rooms: rooms.repo,
        connections: conns.mgr,
      },
      ws as unknown as import('ws').WebSocket,
      { participant_id: actorId, room_id: ROOM },
      msg
    );
  }

  it('PH → Co-Host: event appended, last_activity bumped, delivered to PH and Co-Host only', () => {
    invoke(PH, { kind: 'dm', to_participant_id: COHOST_1, text: 'private note' });

    expect(events.calls).toHaveLength(1);
    const ev = events.calls[0]!;
    expect(ev).toMatchObject({
      room_id: ROOM,
      participant_id: PH,
      kind: 'dm',
      payload: { kind: 'dm', to_participant_id: COHOST_1, text: 'private note' },
    });

    expect(rooms.activity).toEqual([{ room_id: ROOM, ts: ev.ts }]);

    // Both endpoints get identical payloads; no broadcast.
    expect(conns.broadcasts).toEqual([]);
    expect(conns.sends).toHaveLength(2);
    const push: ServerMsg = {
      kind: 'dm',
      event_id: 200,
      from: PH,
      to: COHOST_1,
      text: 'private note',
      ts: ev.ts!,
    };
    expect(conns.sends[0]).toEqual({ participant_id: PH, msg: push });
    expect(conns.sends[1]).toEqual({ participant_id: COHOST_1, msg: push });

    expect(ws.sent).toEqual([]);
  });

  it('Co-Host → PH: delivered to both endpoints', () => {
    invoke(COHOST_1, { kind: 'dm', to_participant_id: PH, text: 'reply' });

    expect(events.calls).toHaveLength(1);
    expect(conns.sends.map((s) => s.participant_id)).toEqual([COHOST_1, PH]);
    expect(conns.sends[0]!.msg).toMatchObject({
      kind: 'dm',
      from: COHOST_1,
      to: PH,
      text: 'reply',
    });
  });

  it('Co-Host → another Co-Host: axis violation, no event, no delivery', () => {
    invoke(COHOST_1, { kind: 'dm', to_participant_id: COHOST_2, text: 'side chat' });

    expect(ws.sent).toEqual([
      {
        kind: 'error',
        code: 'dm_axis_violation',
        detail:
          'direct messages are only available between the Primary Host and Co-Hosts',
      },
    ]);
    expect(events.calls).toEqual([]);
    expect(conns.sends).toEqual([]);
    expect(rooms.activity).toEqual([]);
  });

  it('Participant → PH: axis violation', () => {
    invoke(ALICE, { kind: 'dm', to_participant_id: PH, text: 'psst' });

    expect(ws.sent[0]).toMatchObject({ code: 'dm_axis_violation' });
    expect(events.calls).toEqual([]);
    expect(conns.sends).toEqual([]);
  });

  it('command_entrant → PH: axis violation (only Co-Hosts may DM PH)', () => {
    invoke(CMD, { kind: 'dm', to_participant_id: PH, text: 'question' });

    expect(ws.sent[0]).toMatchObject({ code: 'dm_axis_violation' });
    expect(events.calls).toEqual([]);
    expect(conns.sends).toEqual([]);
  });

  it('PH → Participant: axis violation', () => {
    invoke(PH, { kind: 'dm', to_participant_id: ALICE, text: 'hi' });

    expect(ws.sent[0]).toMatchObject({ code: 'dm_axis_violation' });
    expect(events.calls).toEqual([]);
    expect(conns.sends).toEqual([]);
  });

  it('muted Co-Host → PH: muted error, no event, no delivery', () => {
    invoke(MUTED_CO, { kind: 'dm', to_participant_id: PH, text: 'trying' });

    expect(ws.sent).toEqual([
      { kind: 'error', code: 'muted', detail: 'you have been muted' },
    ]);
    expect(events.calls).toEqual([]);
    expect(conns.sends).toEqual([]);
    expect(rooms.activity).toEqual([]);
  });

  it('recipient not in room (different room_id): recipient_not_found', () => {
    invoke(PH, { kind: 'dm', to_participant_id: FOREIGN_CO, text: 'cross-room' });

    expect(ws.sent[0]).toMatchObject({ code: 'recipient_not_found' });
    expect(events.calls).toEqual([]);
    expect(conns.sends).toEqual([]);
  });

  it('recipient does not exist: recipient_not_found', () => {
    invoke(PH, { kind: 'dm', to_participant_id: 'ghost-id', text: 'hello?' });

    expect(ws.sent[0]).toMatchObject({ code: 'recipient_not_found' });
    expect(events.calls).toEqual([]);
    expect(conns.sends).toEqual([]);
  });

  it('empty text: empty_dm, no event, no delivery', () => {
    invoke(PH, { kind: 'dm', to_participant_id: COHOST_1, text: '   ' });

    expect(ws.sent[0]).toMatchObject({ code: 'empty_dm' });
    expect(events.calls).toEqual([]);
    expect(conns.sends).toEqual([]);
  });

  it('missing target id: bad_target', () => {
    invoke(PH, { kind: 'dm', to_participant_id: '', text: 'hello' });

    expect(ws.sent[0]).toMatchObject({ code: 'bad_target' });
    expect(events.calls).toEqual([]);
    expect(conns.sends).toEqual([]);
  });

  it('unknown sender: unknown_participant', () => {
    invoke('ghost-id', { kind: 'dm', to_participant_id: PH, text: 'hi' });

    expect(ws.sent[0]).toMatchObject({ code: 'unknown_participant' });
    expect(events.calls).toEqual([]);
    expect(conns.sends).toEqual([]);
  });

  it('trims surrounding whitespace before persisting and delivering', () => {
    invoke(PH, { kind: 'dm', to_participant_id: COHOST_1, text: '  padded  ' });

    expect(events.calls[0]!.payload).toEqual({
      kind: 'dm',
      to_participant_id: COHOST_1,
      text: 'padded',
    });
    expect(conns.sends[0]!.msg).toMatchObject({ text: 'padded' });
  });
});
