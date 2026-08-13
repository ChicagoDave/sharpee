/**
 * WS chat broadcast + lock-on-typing tests against a real WS server.
 * AC-10 lock heartbeat is exercised against a small `lockExpiryMs`
 * so the auto-release timer fires within test budget.
 */

import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import {
  startBoundServer,
  openSocket,
  claim,
  createRoom,
  joinRoom,
  delay,
  type BoundServer,
  type TestSocket
} from './ws-helpers.js';

const STORIES = [{ slug: 'dungeo', path: '/fake/dungeo.sharpee' }] as const;

async function helloAndAck(sock: TestSocket, roomId: string, handle: string): Promise<void> {
  sock.send({ type: 'hello', roomId, handle });
  const ack = await sock.recv();
  expect(ack.type).toBe('hello:ack');
  // Drain the presence:connected frame that follows.
  await sock.recvWhere((f) => f.type === 'presence' && f.connected === true);
}

describe('WS chat broadcast (REAL-PATH)', () => {
  let bound: BoundServer;

  beforeEach(async () => {
    bound = await startBoundServer({
      dbFile: ':memory:',
      stories: STORIES,
      helloTimeoutMs: 5000,
      lockExpiryMs: 100
    });
  });

  afterEach(async () => {
    await bound.close();
  });

  it('chat:send from A reaches A AND B as chat:message', async () => {
    await claim(bound.server, 'alice');
    await claim(bound.server, 'bob');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    await joinRoom(bound.server, 'bob', room.id);

    const aliceSock = await openSocket(bound.wsBase, room.id);
    await helloAndAck(aliceSock, room.id, 'alice');
    const bobSock = await openSocket(bound.wsBase, room.id);
    await helloAndAck(bobSock, room.id, 'bob');

    // Alice sees a presence broadcast for bob's connection; drain.
    await aliceSock.recvWhere((f) => f.type === 'presence' && f.connected === true);

    aliceSock.send({ type: 'chat:send', roomId: room.id, text: 'hi room' });

    const aliceMsg = await aliceSock.recvWhere((f) => f.type === 'chat:message');
    const bobMsg = await bobSock.recvWhere((f) => f.type === 'chat:message');
    if (aliceMsg.type === 'chat:message') {
      expect(aliceMsg.text).toBe('hi room');
      expect(aliceMsg.fromHandle).toBe('alice');
    }
    if (bobMsg.type === 'chat:message') {
      expect(bobMsg.text).toBe('hi room');
      expect(bobMsg.fromHandle).toBe('alice');
    }
    aliceSock.close();
    bobSock.close();
  });
});

describe('WS lock-on-typing (AC-10, REAL-PATH)', () => {
  let bound: BoundServer;

  beforeEach(async () => {
    bound = await startBoundServer({
      dbFile: ':memory:',
      stories: STORIES,
      helloTimeoutMs: 5000,
      lockExpiryMs: 100 // small enough for fast tests
    });
  });

  afterEach(async () => {
    await bound.close();
  });

  it('A acquires → both see lock:state{holder:A}; B acquire rejected', async () => {
    await claim(bound.server, 'alice');
    await claim(bound.server, 'bob');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    await joinRoom(bound.server, 'bob', room.id);

    const aliceSock = await openSocket(bound.wsBase, room.id);
    await helloAndAck(aliceSock, room.id, 'alice');
    const bobSock = await openSocket(bound.wsBase, room.id);
    await helloAndAck(bobSock, room.id, 'bob');
    await aliceSock.recvWhere((f) => f.type === 'presence' && f.connected === true);

    aliceSock.send({ type: 'lock:acquire', roomId: room.id });

    const aliceLock = await aliceSock.recvWhere((f) => f.type === 'lock:state');
    const bobLock = await bobSock.recvWhere((f) => f.type === 'lock:state');
    if (aliceLock.type === 'lock:state') expect(aliceLock.holder).not.toBeNull();
    if (bobLock.type === 'lock:state') expect(bobLock.holder).not.toBeNull();

    const aliceHolder =
      aliceLock.type === 'lock:state' ? aliceLock.holder : null;

    // Bob tries to acquire — rejected (no new state broadcast, holder unchanged).
    bobSock.send({ type: 'lock:acquire', roomId: room.id });
    // Give the server a beat; assert no further lock:state with bob as holder.
    await delay(50);
    const drained = [...aliceSock.drained(), ...bobSock.drained()];
    for (const f of drained) {
      if (f.type === 'lock:state') expect(f.holder).toBe(aliceHolder);
    }

    aliceSock.close();
    bobSock.close();
  });

  it('AC-10: auto-release after lockExpiryMs of no heartbeat', async () => {
    await claim(bound.server, 'alice');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');

    const aliceSock = await openSocket(bound.wsBase, room.id);
    await helloAndAck(aliceSock, room.id, 'alice');

    aliceSock.send({ type: 'lock:acquire', roomId: room.id });
    const acquired = await aliceSock.recvWhere((f) => f.type === 'lock:state');
    if (acquired.type === 'lock:state') expect(acquired.holder).not.toBeNull();

    // Wait past the 100ms expiry. AC-10 says auto-release fires and
    // server broadcasts lock:state { holder: null }.
    const released = await aliceSock.recvWhere(
      (f) => f.type === 'lock:state' && f.holder === null,
      500
    );
    if (released.type === 'lock:state') {
      expect(released.holder).toBeNull();
      expect(released.expiresAt).toBeNull();
    }
    aliceSock.close();
  });

  it('explicit lock:release clears immediately', async () => {
    await claim(bound.server, 'alice');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');

    const sock = await openSocket(bound.wsBase, room.id);
    await helloAndAck(sock, room.id, 'alice');

    sock.send({ type: 'lock:acquire', roomId: room.id });
    await sock.recvWhere((f) => f.type === 'lock:state' && f.holder !== null);
    sock.send({ type: 'lock:release', roomId: room.id });
    const released = await sock.recvWhere(
      (f) => f.type === 'lock:state' && f.holder === null
    );
    if (released.type === 'lock:state') expect(released.holder).toBeNull();
    sock.close();
  });
});
