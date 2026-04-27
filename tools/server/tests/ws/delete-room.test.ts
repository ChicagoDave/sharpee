/**
 * handleDeleteRoom unit tests.
 *
 * Behavior Statement — handleDeleteRoom
 *   DOES: when sender is PH and confirm_title exactly matches room.title:
 *           - sandboxes.tearDown(room_id) — sandbox gets SHUTDOWN
 *           - rooms.delete(room_id) — cascade delete of all child rows
 *           - room_closed{reason:'deleted'} broadcast to the room
 *           - every socket in the room is closed with code 4006
 *   WHEN: a delete_room frame arrives on the post-hello dispatch path.
 *   BECAUSE: ADR-153 Decision 12, AC4 — PH-only destructive op with
 *            protocol-level type-to-confirm; broadcast before close.
 *   REJECTS WHEN:
 *     - sender unknown              → unknown_participant
 *     - sender tier != PH           → insufficient_authority
 *     - confirm_title missing       → bad_confirm_title
 *     - room missing                → room_not_found
 *     - confirm_title mismatch      → confirm_title_mismatch (B-6)
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  handleDeleteRoom,
  ROOM_DELETED_CLOSE_CODE,
} from '../../src/ws/handlers/delete-room.js';
import type { ConnectionManager } from '../../src/ws/connection-manager.js';
import type { ParticipantsRepository } from '../../src/repositories/participants.js';
import type { RoomsRepository } from '../../src/repositories/rooms.js';
import type { SandboxRegistry } from '../../src/sandbox/sandbox-registry.js';
import type { Participant, Room, Tier } from '../../src/repositories/types.js';
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

interface CloseRoomCall {
  room_id: string;
  code: number;
  reason: string;
}

function fakeConnections(): {
  mgr: ConnectionManager;
  broadcasts: BroadcastCall[];
  closes: CloseRoomCall[];
} {
  const broadcasts: BroadcastCall[] = [];
  const closes: CloseRoomCall[] = [];
  const mgr: ConnectionManager = {
    register: () => {},
    unregisterParticipant: () => null,
    unregisterSocket: () => null,
    broadcast: (room_id, msg) => {
      broadcasts.push({ room_id, msg });
    },
    send: () => false,
    closeRoom: (room_id, code, reason) => {
      closes.push({ room_id, code, reason });
      return 3;
    },
    getConnectedCount: () => 0,
    getParticipantSocket: () => null,
    getSocketMeta: () => null,
    size: () => 0,
  };
  return { mgr, broadcasts, closes };
}

function fakeRooms(rooms: Room[]): {
  repo: RoomsRepository;
  deleteCalls: string[];
} {
  const byId = new Map<string, Room>();
  for (const r of rooms) byId.set(r.room_id, { ...r });
  const deleteCalls: string[] = [];
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
    setPinned: () => {},
    updatePrimaryHost: () => {},
    delete: (room_id) => {
      deleteCalls.push(room_id);
      byId.delete(room_id);
    },
    listRecycleCandidates: () => [],
  };
  return { repo, deleteCalls };
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
    setIsSuccessor: () => {},
    listForRoom: () => [],
    earliestConnectedParticipant: () => null,
  };
}

function stubRegistry(): { reg: SandboxRegistry; tearDownCalls: string[] } {
  const tearDownCalls: string[] = [];
  const reg: SandboxRegistry = {
    getOrSpawn: () => {
      throw new Error('not used');
    },
    get: () => null,
    tearDown: (room_id) => {
      tearDownCalls.push(room_id);
    },
    tearDownAll: () => {},
    size: () => 0,
  };
  return { reg, tearDownCalls };
}

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    room_id: 'room-A',
    join_code: 'ABC123',
    title: 'Adventure Camp',
    story_slug: 'zork',
    pinned: false,
    last_activity_at: '2026-04-20T10:00:00.000Z',
    created_at: '2026-04-20T09:00:00.000Z',
    primary_host_id: 'ph-id',
    ...overrides,
  };
}

/* ---------- tests ---------- */

describe('handleDeleteRoom', () => {
  const ROOM = 'room-A';
  const PH = 'ph-id';
  const COHOST = 'co-id';
  const ALICE = 'alice-id';

  let conns: ReturnType<typeof fakeConnections>;
  let rooms: ReturnType<typeof fakeRooms>;
  let sandboxes: ReturnType<typeof stubRegistry>;
  let participants: ParticipantsRepository;
  let ws: FakeSocket;

  beforeEach(() => {
    conns = fakeConnections();
    rooms = fakeRooms([makeRoom({ title: 'Adventure Camp' })]);
    sandboxes = stubRegistry();
    participants = fakeParticipants([
      { participant_id: PH, tier: 'primary_host' },
      { participant_id: COHOST, tier: 'co_host' },
      { participant_id: ALICE, tier: 'participant' },
    ]);
    ws = fakeSocket();
  });

  function invoke(
    actorId: string,
    msg: Extract<ClientMsg, { kind: 'delete_room' }>
  ): void {
    handleDeleteRoom(
      {
        participants,
        rooms: rooms.repo,
        connections: conns.mgr,
        sandboxes: sandboxes.reg,
      },
      ws as unknown as import('ws').WebSocket,
      { participant_id: actorId, room_id: ROOM },
      msg
    );
  }

  it('PH with correct confirm_title: sandbox torn down, room deleted, room_closed broadcast, sockets closed', () => {
    invoke(PH, { kind: 'delete_room', confirm_title: 'Adventure Camp' });

    // Sandbox shutdown
    expect(sandboxes.tearDownCalls).toEqual([ROOM]);
    // DB cascade
    expect(rooms.deleteCalls).toEqual([ROOM]);
    // Broadcast
    expect(conns.broadcasts).toEqual([
      {
        room_id: ROOM,
        msg: {
          kind: 'room_closed',
          reason: 'deleted',
          message: 'This room was closed by the host.',
        },
      },
    ]);
    // Socket close
    expect(conns.closes).toEqual([
      { room_id: ROOM, code: ROOM_DELETED_CLOSE_CODE, reason: 'room_deleted' },
    ]);
    expect(ws.sent).toEqual([]);
  });

  it('PH with wrong confirm_title: confirm_title_mismatch, room intact, no sandbox teardown, no broadcast, no close (B-6)', () => {
    invoke(PH, { kind: 'delete_room', confirm_title: 'Wrong Title' });

    expect(ws.sent[0]).toMatchObject({
      code: 'confirm_title_mismatch',
      detail: 'The room title you entered does not match.',
    });
    expect(sandboxes.tearDownCalls).toEqual([]);
    expect(rooms.deleteCalls).toEqual([]);
    expect(conns.broadcasts).toEqual([]);
    expect(conns.closes).toEqual([]);
  });

  it('Co-Host attempts delete: insufficient_authority, room intact', () => {
    invoke(COHOST, { kind: 'delete_room', confirm_title: 'Adventure Camp' });

    expect(ws.sent[0]).toMatchObject({ code: 'insufficient_authority' });
    expect(rooms.deleteCalls).toEqual([]);
    expect(sandboxes.tearDownCalls).toEqual([]);
    expect(conns.broadcasts).toEqual([]);
    expect(conns.closes).toEqual([]);
  });

  it('Participant attempts delete: insufficient_authority', () => {
    invoke(ALICE, { kind: 'delete_room', confirm_title: 'Adventure Camp' });
    expect(ws.sent[0]).toMatchObject({ code: 'insufficient_authority' });
    expect(rooms.deleteCalls).toEqual([]);
  });

  it('empty confirm_title: bad_confirm_title', () => {
    invoke(PH, { kind: 'delete_room', confirm_title: '' });
    expect(ws.sent[0]).toMatchObject({ code: 'bad_confirm_title' });
    expect(rooms.deleteCalls).toEqual([]);
    expect(sandboxes.tearDownCalls).toEqual([]);
  });

  it('room no longer exists: room_not_found, nothing deleted', () => {
    rooms = fakeRooms([]);
    handleDeleteRoom(
      {
        participants,
        rooms: rooms.repo,
        connections: conns.mgr,
        sandboxes: sandboxes.reg,
      },
      ws as unknown as import('ws').WebSocket,
      { participant_id: PH, room_id: ROOM },
      { kind: 'delete_room', confirm_title: 'Adventure Camp' }
    );

    expect(ws.sent[0]).toMatchObject({ code: 'room_not_found' });
    expect(rooms.deleteCalls).toEqual([]);
    expect(sandboxes.tearDownCalls).toEqual([]);
  });

  it('sender unknown: unknown_participant, nothing deleted', () => {
    invoke('ghost', { kind: 'delete_room', confirm_title: 'Adventure Camp' });
    expect(ws.sent[0]).toMatchObject({ code: 'unknown_participant' });
    expect(rooms.deleteCalls).toEqual([]);
  });

  it('confirm_title is case-sensitive (exact match required)', () => {
    invoke(PH, { kind: 'delete_room', confirm_title: 'adventure camp' });
    expect(ws.sent[0]).toMatchObject({ code: 'confirm_title_mismatch' });
    expect(rooms.deleteCalls).toEqual([]);
  });

  it('broadcast happens BEFORE socket close (ordering is load-bearing)', () => {
    // Track order of interactions by intercepting the close; we already see
    // broadcasts[] populated above, but re-assert the sequence here.
    let broadcastIdx = -1;
    let closeIdx = -1;
    let step = 0;
    const custom: ConnectionManager = {
      ...conns.mgr,
      broadcast: () => {
        broadcastIdx = step++;
      },
      closeRoom: () => {
        closeIdx = step++;
        return 1;
      },
    };
    handleDeleteRoom(
      {
        participants,
        rooms: rooms.repo,
        connections: custom,
        sandboxes: sandboxes.reg,
      },
      ws as unknown as import('ws').WebSocket,
      { participant_id: PH, room_id: ROOM },
      { kind: 'delete_room', confirm_title: 'Adventure Camp' }
    );

    expect(broadcastIdx).toBeGreaterThanOrEqual(0);
    expect(closeIdx).toBeGreaterThan(broadcastIdx);
  });
});
