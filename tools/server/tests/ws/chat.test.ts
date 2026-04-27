/**
 * handleChat unit tests.
 *
 * Behavior Statement — handleChat
 *   DOES:
 *     - Appends session_events{kind:'chat', payload:{kind:'chat', text}} with
 *       sender as participant_id, reads back the assigned event_id.
 *     - Bumps rooms.last_activity_at to the same ts passed to append.
 *     - Broadcasts chat{event_id, from, text, ts} to every socket in the room
 *       (sender included).
 *   WHEN: a chat frame arrives on the post-hello dispatch path.
 *   BECAUSE: ADR-153 Decision 8 (room chat channel); Decision 11 (chat events
 *            persisted with participant_id for full export/replay).
 *   REJECTS WHEN:
 *     - text empty/whitespace-only  → error 'empty_chat'; no event, no broadcast
 *     - sender unknown              → error 'unknown_participant'
 *     - sender muted                → error 'muted'; no event, no broadcast
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { handleChat } from '../../src/ws/handlers/chat.js';
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
  ts?: string;
}

function fakeSessionEvents(): { repo: SessionEventsRepository; calls: AppendCall[] } {
  const calls: AppendCall[] = [];
  let nextId = 100;
  const repo: SessionEventsRepository = {
    append: (input) => {
      calls.push({ ...input });
      return nextId++;
    },
    listForRoom: () => [],
  };
  return { repo, calls };
}

interface ActivityCall {
  room_id: string;
  ts: string;
}

function fakeRooms(): { repo: RoomsRepository; activity: ActivityCall[] } {
  const activity: ActivityCall[] = [];
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

describe('handleChat', () => {
  const ROOM = 'room-A';
  const ALICE = 'alice-id';
  const BOB = 'bob-id';

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
      { participant_id: ALICE, tier: 'participant' },
      { participant_id: BOB, tier: 'participant', muted: true },
    ]);
    ws = fakeSocket();
  });

  function invoke(
    actorId: string,
    msg: Extract<ClientMsg, { kind: 'chat' }>
  ): void {
    handleChat(
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

  it('participant sends chat: event appended, last_activity bumped, broadcast to room', () => {
    invoke(ALICE, { kind: 'chat', text: 'hello world' });

    // Persisted row
    expect(events.calls).toHaveLength(1);
    const ev = events.calls[0]!;
    expect(ev).toMatchObject({
      room_id: ROOM,
      participant_id: ALICE,
      kind: 'chat',
      payload: { kind: 'chat', text: 'hello world' },
    });
    expect(typeof ev.ts).toBe('string');

    // last_activity bump uses same ts as the event
    expect(rooms.activity).toEqual([{ room_id: ROOM, ts: ev.ts }]);

    // Broadcast uses the assigned event_id and the same ts
    expect(conns.calls).toHaveLength(1);
    expect(conns.calls[0]).toEqual({
      room_id: ROOM,
      msg: {
        kind: 'chat',
        event_id: 100,
        from: ALICE,
        text: 'hello world',
        ts: ev.ts,
      },
    });

    // No error returned to sender
    expect(ws.sent).toEqual([]);
  });

  it('trims surrounding whitespace before persisting and broadcasting', () => {
    invoke(ALICE, { kind: 'chat', text: '   padded   ' });

    expect(events.calls[0]!.payload).toEqual({ kind: 'chat', text: 'padded' });
    expect(conns.calls[0]!.msg).toMatchObject({ kind: 'chat', text: 'padded' });
  });

  it('muted participant sends chat: error returned, no event, no broadcast, no activity bump', () => {
    invoke(BOB, { kind: 'chat', text: 'trying to speak' });

    expect(ws.sent).toEqual([
      { kind: 'error', code: 'muted', detail: 'you have been muted' },
    ]);
    expect(events.calls).toEqual([]);
    expect(conns.calls).toEqual([]);
    expect(rooms.activity).toEqual([]);
  });

  it('empty text: error returned, no event, no broadcast, no activity bump', () => {
    invoke(ALICE, { kind: 'chat', text: '' });

    expect(ws.sent).toEqual([
      { kind: 'error', code: 'empty_chat', detail: 'chat requires non-empty text' },
    ]);
    expect(events.calls).toEqual([]);
    expect(conns.calls).toEqual([]);
    expect(rooms.activity).toEqual([]);
  });

  it('whitespace-only text: treated as empty', () => {
    invoke(ALICE, { kind: 'chat', text: '    \t\n  ' });

    expect(ws.sent[0]).toMatchObject({ code: 'empty_chat' });
    expect(events.calls).toEqual([]);
    expect(conns.calls).toEqual([]);
  });

  it('unknown sender: error returned, no event, no broadcast', () => {
    invoke('ghost-id', { kind: 'chat', text: 'hi' });

    expect(ws.sent[0]).toMatchObject({ code: 'unknown_participant' });
    expect(events.calls).toEqual([]);
    expect(conns.calls).toEqual([]);
  });
});
