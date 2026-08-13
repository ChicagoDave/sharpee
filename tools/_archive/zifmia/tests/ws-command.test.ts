/**
 * AC-6 transport split — `POST /api/rooms/:id/command` returns only
 * `{ turnId }`; the TurnPacket arrives over WS to every connected
 * participant (submitter included).
 *
 * Also covers the /force-release HTTP route and role_change broadcast
 * via the Phase-2 promote route (now hub-aware).
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

const STORIES = [{ slug: 'dungeo', path: '/fake/dungeo.sharpee' }] as const;

async function helloAndAck(sock: TestSocket, roomId: string, handle: string): Promise<void> {
  sock.send({ type: 'hello', roomId, handle });
  const ack = await sock.recv();
  expect(ack.type).toBe('hello:ack');
  await sock.recvWhere((f) => f.type === 'presence' && f.connected === true);
}

describe('POST /api/rooms/:id/command — AC-6 transport split', () => {
  let bound: BoundServer;

  beforeEach(async () => {
    bound = await startBoundServer({
      dbFile: ':memory:',
      stories: STORIES,
      helloTimeoutMs: 5000,
      lockExpiryMs: 200
    });
  });

  afterEach(async () => {
    await bound.close();
  });

  it('HTTP response carries ONLY { turnId } — TurnPacket arrives via WS', async () => {
    await claim(bound.server, 'alice');
    await claim(bound.server, 'bob');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    await joinRoom(bound.server, 'bob', room.id);

    const aliceSock = await openSocket(bound.wsBase, room.id);
    await helloAndAck(aliceSock, room.id, 'alice');
    const bobSock = await openSocket(bound.wsBase, room.id);
    await helloAndAck(bobSock, room.id, 'bob');
    await aliceSock.recvWhere((f) => f.type === 'presence' && f.connected === true);

    // Submitter (alice) issues the command.
    const res = await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/command`,
      payload: { handle: 'alice', text: 'look' }
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { turnId: string } & Record<string, unknown>;
    expect(body.turnId).toMatch(/^[0-9a-f-]{36}$/i);
    // ADR-177 §Invariants: no TurnPacket in the HTTP body.
    expect((body as Record<string, unknown>).packet).toBeUndefined();
    expect((body as Record<string, unknown>).channels).toBeUndefined();

    // The same turnId arrives over WS to BOTH alice (submitter) AND bob (observer).
    const aliceTurn = await aliceSock.recvWhere((f) => f.type === 'turn');
    const bobTurn = await bobSock.recvWhere((f) => f.type === 'turn');
    if (aliceTurn.type === 'turn') {
      expect(aliceTurn.turnId).toBe(body.turnId);
      expect(aliceTurn.submitter.handle).toBe('alice');
      expect(aliceTurn.packet.turnId).toBe(body.turnId);
      // Phase-3 echo router: the main channel carries the submitted text.
      expect(aliceTurn.packet.channels.main).toBeDefined();
    }
    if (bobTurn.type === 'turn') {
      expect(bobTurn.turnId).toBe(body.turnId);
    }

    aliceSock.close();
    bobSock.close();
  });

  it('rejects /command from a non-participant with 403', async () => {
    await claim(bound.server, 'alice');
    await claim(bound.server, 'outsider');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');

    const res = await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/command`,
      payload: { handle: 'outsider', text: 'look' }
    });
    expect(res.statusCode).toBe(403);
  });

  it('rejects /command with empty / oversize text with 400', async () => {
    await claim(bound.server, 'alice');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');

    for (const text of ['', 'x'.repeat(1001)]) {
      const res = await bound.server.app.inject({
        method: 'POST',
        url: `/api/rooms/${room.id}/command`,
        payload: { handle: 'alice', text }
      });
      expect(res.statusCode).toBe(400);
    }
  });
});

describe('POST /api/rooms/:id/force-release', () => {
  let bound: BoundServer;

  beforeEach(async () => {
    bound = await startBoundServer({
      dbFile: ':memory:',
      stories: STORIES,
      helloTimeoutMs: 5000,
      lockExpiryMs: 5000 // long enough not to auto-release during the test
    });
  });

  afterEach(async () => {
    await bound.close();
  });

  it('PH can force-release a participant\'s lock; lock:state broadcast follows', async () => {
    await claim(bound.server, 'alice');
    await claim(bound.server, 'bob');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    await joinRoom(bound.server, 'bob', room.id);

    const aliceSock = await openSocket(bound.wsBase, room.id);
    await helloAndAck(aliceSock, room.id, 'alice');
    const bobSock = await openSocket(bound.wsBase, room.id);
    await helloAndAck(bobSock, room.id, 'bob');
    await aliceSock.recvWhere((f) => f.type === 'presence' && f.connected === true);

    // Bob acquires the lock via WS.
    bobSock.send({ type: 'lock:acquire', roomId: room.id });
    await bobSock.recvWhere((f) => f.type === 'lock:state' && f.holder !== null);
    await aliceSock.recvWhere((f) => f.type === 'lock:state' && f.holder !== null);

    // PH (alice) force-releases via HTTP.
    const res = await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/force-release`,
      payload: { handle: 'alice' }
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ released: true });

    const released = await bobSock.recvWhere(
      (f) => f.type === 'lock:state' && f.holder === null
    );
    if (released.type === 'lock:state') expect(released.holder).toBeNull();

    aliceSock.close();
    bobSock.close();
  });

  it('Participant cannot force-release (403)', async () => {
    await claim(bound.server, 'alice');
    await claim(bound.server, 'bob');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    await joinRoom(bound.server, 'bob', room.id);

    const res = await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/force-release`,
      payload: { handle: 'bob' }
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('role_change WS broadcast on Phase-2 promote (hub-aware)', () => {
  let bound: BoundServer;

  beforeEach(async () => {
    bound = await startBoundServer({
      dbFile: ':memory:',
      stories: STORIES,
      helloTimeoutMs: 5000,
      lockExpiryMs: 200
    });
  });

  afterEach(async () => {
    await bound.close();
  });

  it('PH promote → all sockets in the room receive role_change', async () => {
    await claim(bound.server, 'alice');
    await claim(bound.server, 'bob');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    await joinRoom(bound.server, 'bob', room.id);

    const aliceSock = await openSocket(bound.wsBase, room.id);
    await helloAndAck(aliceSock, room.id, 'alice');
    const bobSock = await openSocket(bound.wsBase, room.id);
    await helloAndAck(bobSock, room.id, 'bob');
    await aliceSock.recvWhere((f) => f.type === 'presence' && f.connected === true);

    const res = await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/promote`,
      payload: { handle: 'alice', target: 'bob', to_tier: 'co_host' }
    });
    expect(res.statusCode).toBe(200);

    const aliceRC = await aliceSock.recvWhere((f) => f.type === 'role_change');
    const bobRC = await bobSock.recvWhere((f) => f.type === 'role_change');
    if (aliceRC.type === 'role_change') expect(aliceRC.tier).toBe('co_host');
    if (bobRC.type === 'role_change') expect(bobRC.tier).toBe('co_host');

    aliceSock.close();
    bobSock.close();
  });
});
