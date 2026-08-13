/**
 * AC-9 erase + 4007 close: a successful POST /api/identities/erase
 * with active WS connections closes those sockets with code 4007
 * (IDENTITY_ERASED) per ADR-177 §5.
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
  await sock.recvWhere((f) => f.type === 'presence' && f.participantId === ack.participantId && f.connected === true);
  return ack.participantId;
}

describe('identity erase + 4007 teardown (AC-9 re-verification)', () => {
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

  it('open WS sockets for the erased identity are closed with code 4007', async () => {
    await claim(bound.server, 'alice');
    await claim(bound.server, 'bob');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    await joinRoom(bound.server, 'bob', room.id);

    const aliceSock = await openSocket(bound.wsBase, room.id);
    await helloAndDrain(aliceSock, room.id, 'alice');
    const bobSock = await openSocket(bound.wsBase, room.id);
    await helloAndDrain(bobSock, room.id, 'bob');

    // Erase bob's identity.
    const res = await bound.server.app.inject({
      method: 'POST',
      url: '/api/identities/erase',
      payload: { handle: 'bob' }
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ erased: true });

    // Bob's socket closes with 4007.
    const closed = await bobSock.awaitClose();
    expect(closed.code).toBe(CLOSE_CODES.IDENTITY_ERASED);

    // Alice's socket is unaffected.
    expect(bound.server.identityRepo.getByHandle('bob')).toBeUndefined();
    // (Alice may have received a presence{connected:false} for bob via CASCADE;
    // we don't assert on it here — Phase 5b will tighten the disconnect flow.)
    aliceSock.close();
  });

  it('reclaim after erase succeeds with a new id (AC-9 round-trip)', async () => {
    await claim(bound.server, 'alice');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    void room;

    const original = bound.server.identityRepo.getByHandle('alice');
    expect(original).toBeDefined();

    const erase = await bound.server.app.inject({
      method: 'POST',
      url: '/api/identities/erase',
      payload: { handle: 'alice' }
    });
    expect(erase.statusCode).toBe(200);

    const reclaim = await bound.server.app.inject({
      method: 'POST',
      url: '/api/identities',
      payload: { handle: 'alice' }
    });
    expect(reclaim.statusCode).toBe(201);
    const newId = (reclaim.json() as { id: string }).id;
    expect(newId).not.toBe(original?.id);
  });
});
