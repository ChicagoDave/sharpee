/**
 * GET /api/rooms/:id/state — RoomStateResponse assembly per ADR-177 §4.
 */

import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import {
  startBoundServer,
  openSocket,
  claim,
  createRoom,
  joinRoom,
  type BoundServer,
  type TestSocket
} from './ws-helpers.js';
import { DEFAULT_RECORDING_NOTICE } from '../src/rooms/state-routes.js';

const STORIES = [{ slug: 'dungeo', path: '/fake/dungeo.sharpee' }] as const;

async function helloAndDrainPresence(sock: TestSocket, roomId: string, handle: string): Promise<string> {
  sock.send({ type: 'hello', roomId, handle });
  const ack = await sock.recv();
  if (ack.type !== 'hello:ack') throw new Error('expected hello:ack');
  await sock.recvWhere((f) => f.type === 'presence' && f.connected === true && f.participantId === ack.participantId);
  return ack.participantId;
}

describe('GET /api/rooms/:id/state', () => {
  let bound: BoundServer;

  beforeEach(async () => {
    bound = await startBoundServer({
      dbFile: ':memory:',
      stories: STORIES,
      helloTimeoutMs: 5000,
      lockExpiryMs: 5000,
      recycleManualOnly: true
    });
  });

  afterEach(async () => {
    await bound.close();
  });

  it('returns the typed RoomStateResponse shape', async () => {
    await claim(bound.server, 'alice');
    await claim(bound.server, 'bob');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    await joinRoom(bound.server, 'bob', room.id);

    const res = await bound.server.app.inject({
      method: 'GET',
      url: `/api/rooms/${room.id}/state?handle=alice`
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      room: { id: string; title: string; join_code: string; story_slug: string; pinned: boolean; primary_host_id: string; recording_notice: string };
      cmgt: { channels: Record<string, unknown> };
      transcript_backlog: Array<{ turnId: string; channels: Record<string, unknown[]> }>;
      roster: Array<{ participant_id: string; handle: string; tier: string; muted: boolean; connected: boolean; is_successor: boolean }>;
      lock: { holder: string | null; expiresAt: number | null };
      grace: undefined;
    };
    expect(body.room.title).toBe('R1');
    expect(body.room.recording_notice).toBe(DEFAULT_RECORDING_NOTICE);
    expect(body.roster).toHaveLength(2);
    expect(body.roster.map((r) => r.handle).sort()).toEqual(['alice', 'bob']);
    expect(body.transcript_backlog).toEqual([]);
    expect(body.lock).toEqual({ holder: null, expiresAt: null });
    expect(body.grace).toBeUndefined();
  });

  it('transcript_backlog reflects POST /command rows, capped at limit', async () => {
    await claim(bound.server, 'alice');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');

    for (let i = 0; i < 5; i += 1) {
      await bound.server.app.inject({
        method: 'POST',
        url: `/api/rooms/${room.id}/command`,
        payload: { handle: 'alice', text: `cmd ${i}` }
      });
    }

    const res = await bound.server.app.inject({
      method: 'GET',
      url: `/api/rooms/${room.id}/state?handle=alice`
    });
    const body = res.json() as {
      transcript_backlog: Array<{
        turnId: string;
        text: string;
        submitter: { id: string; handle: string } | null;
      }>;
    };
    // Phase 7 rewrite: state-routes pairs `command` + `output` rows by
    // turnId into a single merged backlog entry per turn (replay anchored
    // on `output`). 5 commands → 5 backlog entries, each carrying the
    // submitter handle + command text from the paired `command` row.
    expect(body.transcript_backlog).toHaveLength(5);
    expect(body.transcript_backlog.every((t) => typeof t.turnId === 'string')).toBe(true);
    expect(body.transcript_backlog.map((t) => t.text)).toEqual([
      'cmd 0', 'cmd 1', 'cmd 2', 'cmd 3', 'cmd 4'
    ]);
    expect(body.transcript_backlog.every((t) => t.submitter?.handle === 'alice')).toBe(true);
  });

  it('roster.connected reflects current WS subscriptions', async () => {
    await claim(bound.server, 'alice');
    await claim(bound.server, 'bob');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    await joinRoom(bound.server, 'bob', room.id);

    const aliceSock = await openSocket(bound.wsBase, room.id);
    await helloAndDrainPresence(aliceSock, room.id, 'alice');

    const res = await bound.server.app.inject({
      method: 'GET',
      url: `/api/rooms/${room.id}/state?handle=alice`
    });
    const body = res.json() as { roster: Array<{ handle: string; connected: boolean }> };
    const aliceRoster = body.roster.find((r) => r.handle === 'alice')!;
    const bobRoster = body.roster.find((r) => r.handle === 'bob')!;
    expect(aliceRoster.connected).toBe(true);
    expect(bobRoster.connected).toBe(false);
    aliceSock.close();
  });

  it('lock state surfaces current holder + expiresAt when held', async () => {
    await claim(bound.server, 'alice');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    const sock = await openSocket(bound.wsBase, room.id);
    const pid = await helloAndDrainPresence(sock, room.id, 'alice');

    sock.send({ type: 'lock:acquire', roomId: room.id });
    await sock.recvWhere((f) => f.type === 'lock:state' && f.holder !== null);

    const res = await bound.server.app.inject({
      method: 'GET',
      url: `/api/rooms/${room.id}/state?handle=alice`
    });
    const body = res.json() as { lock: { holder: string | null; expiresAt: number | null } };
    expect(body.lock.holder).toBe(pid);
    expect(body.lock.expiresAt).toBeGreaterThan(Date.now() - 1000);
    sock.close();
  });

  it('grace surfaces while PH disconnect is pending', async () => {
    await claim(bound.server, 'alice');
    await claim(bound.server, 'bob');
    const bound2 = await startBoundServer({
      dbFile: ':memory:',
      stories: STORIES,
      helloTimeoutMs: 5000,
      lockExpiryMs: 5000,
      graceMs: 500, // long enough to assert state mid-grace
      recycleManualOnly: true
    });
    try {
      await claim(bound2.server, 'alice');
      await claim(bound2.server, 'bob');
      const room = await createRoom(bound2.server, 'alice', 'dungeo', 'R1');
      await joinRoom(bound2.server, 'bob', room.id);

      const aliceSock = await openSocket(bound2.wsBase, room.id);
      await helloAndDrainPresence(aliceSock, room.id, 'alice');
      const bobSock = await openSocket(bound2.wsBase, room.id);
      await helloAndDrainPresence(bobSock, room.id, 'bob');

      aliceSock.close();
      // Wait for bob to see the grace presence frame — this confirms
      // the server's onPresence listener has run and the grace timer
      // is registered before we query /state.
      await bobSock.recvWhere(
        (f) => f.type === 'presence' && typeof f.graceDeadline === 'number'
      );

      const res = await bound2.server.app.inject({
        method: 'GET',
        url: `/api/rooms/${room.id}/state?handle=bob`
      });
      const body = res.json() as { grace?: { pending: boolean } };
      expect(body.grace?.pending).toBe(true);
      bobSock.close();
    } finally {
      await bound2.close();
    }
  });

  it('401 unknown_handle / 404 room_not_found / 403 not_in_room', async () => {
    await claim(bound.server, 'alice');
    await claim(bound.server, 'outsider');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');

    const r401 = await bound.server.app.inject({ method: 'GET', url: `/api/rooms/${room.id}/state?handle=ghost` });
    expect(r401.statusCode).toBe(401);

    const r404 = await bound.server.app.inject({ method: 'GET', url: '/api/rooms/00000000-0000-0000-0000-000000000000/state?handle=alice' });
    expect(r404.statusCode).toBe(404);

    const r403 = await bound.server.app.inject({ method: 'GET', url: `/api/rooms/${room.id}/state?handle=outsider` });
    expect(r403.statusCode).toBe(403);
  });
});
