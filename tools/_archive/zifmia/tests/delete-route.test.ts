/**
 * Phase 6 — POST /api/rooms/:id/delete with title-confirmation gate.
 * REAL-PATH against Fastify + SQLite + WS.
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
import { CLOSE_CODES } from '../src/ws/types.js';

const STORIES = [{ slug: 'dungeo', path: '/fake/dungeo.sharpee' }] as const;

async function helloAndDrain(sock: TestSocket, roomId: string, handle: string): Promise<string> {
  sock.send({ type: 'hello', roomId, handle });
  const ack = await sock.recv();
  if (ack.type !== 'hello:ack') throw new Error('expected hello:ack');
  await sock.recvWhere((f) => f.type === 'presence' && f.connected === true && f.participantId === ack.participantId);
  return ack.participantId;
}

describe('POST /api/rooms/:id/delete', () => {
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

  it('requires the caller to be PH (403 for participant)', async () => {
    await claim(bound.server, 'alice');
    await claim(bound.server, 'bob');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'My Room');
    await joinRoom(bound.server, 'bob', room.id);

    const res = await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/delete`,
      payload: { handle: 'bob', confirm_title: 'My Room' }
    });
    expect(res.statusCode).toBe(403);
  });

  it('rejects mismatched confirm_title with 422', async () => {
    await claim(bound.server, 'alice');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'Exact Title');

    const res = await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/delete`,
      payload: { handle: 'alice', confirm_title: 'exact title' }
    });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toEqual({ error: 'title_mismatch' });

    // Room still live.
    expect(bound.server.roomsRepo.getRoom(room.id)?.deleted_at).toBeNull();
  });

  it('PH + matching title soft-deletes and closes WS sockets with 4004', async () => {
    await claim(bound.server, 'alice');
    await claim(bound.server, 'bob');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'My Room');
    await joinRoom(bound.server, 'bob', room.id);

    const aliceSock = await openSocket(bound.wsBase, room.id);
    await helloAndDrain(aliceSock, room.id, 'alice');
    const bobSock = await openSocket(bound.wsBase, room.id);
    await helloAndDrain(bobSock, room.id, 'bob');

    const res = await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/delete`,
      payload: { handle: 'alice', confirm_title: 'My Room' }
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ deleted: true });

    // Row soft-deleted (deleted_at != null).
    expect(bound.server.roomsRepo.getRoom(room.id)?.deleted_at).not.toBeNull();

    // Both sockets closed with 4004.
    const aliceClose = await aliceSock.awaitClose();
    const bobClose = await bobSock.awaitClose();
    expect(aliceClose.code).toBe(CLOSE_CODES.ROOM_NOT_FOUND);
    expect(bobClose.code).toBe(CLOSE_CODES.ROOM_NOT_FOUND);

    // Audit row appended.
    const lifecycle = bound.server.sessionEvents.listByRoom(room.id, { kinds: ['lifecycle'] });
    expect(lifecycle.some((e) => (e.payload as { event: string }).event === 'deleted')).toBe(true);

    // Lobby no longer lists the room.
    expect(bound.server.roomsRepo.listLobby()).toHaveLength(0);
  });

  it('deleted room can no longer be joined / state-fetched (404)', async () => {
    await claim(bound.server, 'alice');
    await claim(bound.server, 'bob');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'T');
    await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/delete`,
      payload: { handle: 'alice', confirm_title: 'T' }
    });

    const joinRes = await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/join`,
      payload: { handle: 'bob' }
    });
    expect(joinRes.statusCode).toBe(404);

    const stateRes = await bound.server.app.inject({
      method: 'GET',
      url: `/api/rooms/${room.id}/state?handle=alice`
    });
    expect(stateRes.statusCode).toBe(404);
  });
});
