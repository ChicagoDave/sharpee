/**
 * handlePin unit tests (covers both pin and unpin frames).
 *
 * Behavior Statement — handlePin
 *   DOES: when sender is PH and room's current pinned differs from requested:
 *           - rooms.setPinned(room_id, desired)
 *           - session_events(lifecycle, op='pinned' | 'unpinned') appended
 *           - room_state{pinned, last_activity_at} broadcast to room
 *   WHEN: a pin or unpin frame arrives on the post-hello dispatch path.
 *   BECAUSE: ADR-153 Decision 12 — PH-only lifecycle flip; broadcast state so
 *            every client updates its pin indicator.
 *   REJECTS WHEN:
 *     - sender unknown                → unknown_participant
 *     - sender tier != primary_host   → insufficient_authority
 *     - room missing                  → room_not_found
 *     - already in desired state      → already_pinned / already_unpinned
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { handlePin } from '../../src/ws/handlers/pin.js';
import type { ConnectionManager } from '../../src/ws/connection-manager.js';
import type { ParticipantsRepository } from '../../src/repositories/participants.js';
import type { RoomsRepository } from '../../src/repositories/rooms.js';
import type { SessionEventsRepository } from '../../src/repositories/session-events.js';
import type {
  Participant,
  Room,
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
  let nextId = 500;
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

interface SetPinnedCall {
  room_id: string;
  pinned: boolean;
}

function fakeRooms(rooms: Room[]): {
  repo: RoomsRepository;
  setPinnedCalls: SetPinnedCall[];
} {
  const byId = new Map<string, Room>();
  for (const r of rooms) byId.set(r.room_id, { ...r });
  const setPinnedCalls: SetPinnedCall[] = [];
  const repo: RoomsRepository = {
    create: () => {
      throw new Error('not used');
    },
    findById: (id) => {
      const r = byId.get(id);
      return r ? { ...r } : null;
    },
    findByJoinCode: () => null,
    updateLastActivity: () => {},
    setPinned: (room_id, pinned) => {
      setPinnedCalls.push({ room_id, pinned });
      const r = byId.get(room_id);
      if (r) r.pinned = pinned;
    },
    updatePrimaryHost: () => {},
    delete: () => {},
    listRecycleCandidates: () => [],
  };
  return { repo, setPinnedCalls };
}

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    room_id: 'room-A',
    join_code: 'ABC123',
    title: 'A Room',
    story_slug: 'zork',
    pinned: false,
    last_activity_at: '2026-04-20T10:00:00.000Z',
    created_at: '2026-04-20T09:00:00.000Z',
    primary_host_id: 'ph-id',
    ...overrides,
  };
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

describe('handlePin', () => {
  const ROOM = 'room-A';
  const PH = 'ph-id';
  const COHOST = 'co-id';
  const ALICE = 'alice-id';

  let conns: ReturnType<typeof fakeConnections>;
  let events: ReturnType<typeof fakeSessionEvents>;
  let rooms: ReturnType<typeof fakeRooms>;
  let participants: ParticipantsRepository;
  let ws: FakeSocket;

  beforeEach(() => {
    conns = fakeConnections();
    events = fakeSessionEvents();
    rooms = fakeRooms([makeRoom({ pinned: false })]);
    participants = fakeParticipants([
      { participant_id: PH, tier: 'primary_host' },
      { participant_id: COHOST, tier: 'co_host' },
      { participant_id: ALICE, tier: 'participant' },
    ]);
    ws = fakeSocket();
  });

  function invoke(
    actorId: string,
    msg: Extract<ClientMsg, { kind: 'pin' } | { kind: 'unpin' }>
  ): void {
    handlePin(
      {
        participants,
        rooms: rooms.repo,
        sessionEvents: events.repo,
        connections: conns.mgr,
      },
      ws as unknown as import('ws').WebSocket,
      { participant_id: actorId, room_id: ROOM },
      msg
    );
  }

  it('PH pins unpinned room: DB updated, lifecycle event, room_state broadcast', () => {
    invoke(PH, { kind: 'pin' });

    expect(rooms.setPinnedCalls).toEqual([{ room_id: ROOM, pinned: true }]);
    expect(events.calls).toHaveLength(1);
    expect(events.calls[0]).toMatchObject({
      room_id: ROOM,
      participant_id: PH,
      kind: 'lifecycle',
      payload: { kind: 'lifecycle', op: 'pinned' },
    });
    expect(conns.calls).toHaveLength(1);
    expect(conns.calls[0]!.msg).toMatchObject({
      kind: 'room_state',
      pinned: true,
      last_activity_at: expect.any(String),
    });
    expect(ws.sent).toEqual([]);
  });

  it('PH unpins pinned room: DB updated, lifecycle event, broadcast', () => {
    rooms = fakeRooms([makeRoom({ pinned: true })]);

    handlePin(
      {
        participants,
        rooms: rooms.repo,
        sessionEvents: events.repo,
        connections: conns.mgr,
      },
      ws as unknown as import('ws').WebSocket,
      { participant_id: PH, room_id: ROOM },
      { kind: 'unpin' }
    );

    expect(rooms.setPinnedCalls).toEqual([{ room_id: ROOM, pinned: false }]);
    expect(events.calls[0]).toMatchObject({
      kind: 'lifecycle',
      payload: { kind: 'lifecycle', op: 'unpinned' },
    });
    expect(conns.calls[0]!.msg).toMatchObject({
      kind: 'room_state',
      pinned: false,
    });
  });

  it('Co-Host attempts pin: insufficient_authority, no DB, no event, no broadcast', () => {
    invoke(COHOST, { kind: 'pin' });

    expect(ws.sent[0]).toMatchObject({ code: 'insufficient_authority' });
    expect(rooms.setPinnedCalls).toEqual([]);
    expect(events.calls).toEqual([]);
    expect(conns.calls).toEqual([]);
  });

  it('Participant attempts unpin: insufficient_authority', () => {
    invoke(ALICE, { kind: 'unpin' });
    expect(ws.sent[0]).toMatchObject({ code: 'insufficient_authority' });
    expect(rooms.setPinnedCalls).toEqual([]);
  });

  it('already-pinned PH pin request: already_pinned rejection; no DB, no event, no broadcast', () => {
    rooms = fakeRooms([makeRoom({ pinned: true })]);
    handlePin(
      {
        participants,
        rooms: rooms.repo,
        sessionEvents: events.repo,
        connections: conns.mgr,
      },
      ws as unknown as import('ws').WebSocket,
      { participant_id: PH, room_id: ROOM },
      { kind: 'pin' }
    );

    expect(ws.sent[0]).toMatchObject({ code: 'already_pinned' });
    expect(rooms.setPinnedCalls).toEqual([]);
    expect(events.calls).toEqual([]);
    expect(conns.calls).toEqual([]);
  });

  it('already-unpinned PH unpin request: already_unpinned rejection', () => {
    invoke(PH, { kind: 'unpin' });

    expect(ws.sent[0]).toMatchObject({ code: 'already_unpinned' });
    expect(rooms.setPinnedCalls).toEqual([]);
    expect(events.calls).toEqual([]);
    expect(conns.calls).toEqual([]);
  });

  it('room no longer exists: room_not_found', () => {
    rooms = fakeRooms([]);
    handlePin(
      {
        participants,
        rooms: rooms.repo,
        sessionEvents: events.repo,
        connections: conns.mgr,
      },
      ws as unknown as import('ws').WebSocket,
      { participant_id: PH, room_id: ROOM },
      { kind: 'pin' }
    );

    expect(ws.sent[0]).toMatchObject({ code: 'room_not_found' });
    expect(rooms.setPinnedCalls).toEqual([]);
  });

  it('sender unknown: unknown_participant', () => {
    invoke('ghost', { kind: 'pin' });
    expect(ws.sent[0]).toMatchObject({ code: 'unknown_participant' });
    expect(rooms.setPinnedCalls).toEqual([]);
  });
});
