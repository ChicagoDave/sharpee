/**
 * AC-12 mute enforcement — REAL-PATH against WS server.
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

async function helloAndDrain(sock: TestSocket, roomId: string, handle: string): Promise<string> {
  sock.send({ type: 'hello', roomId, handle });
  const ack = await sock.recv();
  if (ack.type !== 'hello:ack') throw new Error('expected hello:ack');
  await sock.recvWhere((f) => f.type === 'presence' && f.connected === true && f.participantId === ack.participantId);
  return ack.participantId;
}

describe('AC-12 mute enforcement (REAL-PATH)', () => {
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

  it('PH /mute → mute_state WS broadcast + participants.muted persists', async () => {
    await claim(bound.server, 'alice');
    await claim(bound.server, 'bob');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    await joinRoom(bound.server, 'bob', room.id);

    const aliceSock = await openSocket(bound.wsBase, room.id);
    await helloAndDrain(aliceSock, room.id, 'alice');
    const bobSock = await openSocket(bound.wsBase, room.id);
    const bobPid = await helloAndDrain(bobSock, room.id, 'bob');
    await aliceSock.recvWhere((f) => f.type === 'presence' && f.participantId === bobPid);

    const res = await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/mute`,
      payload: { handle: 'alice', target: 'bob', muted: true }
    });
    expect(res.statusCode).toBe(200);

    // mute_state broadcast.
    const aliceMute = await aliceSock.recvWhere(
      (f) => f.type === 'mute_state' && f.participantId === bobPid
    );
    const bobMute = await bobSock.recvWhere(
      (f) => f.type === 'mute_state' && f.participantId === bobPid
    );
    if (aliceMute.type === 'mute_state') expect(aliceMute.muted).toBe(true);
    if (bobMute.type === 'mute_state') expect(bobMute.muted).toBe(true);

    // Row reflects mute.
    expect(bound.server.participantsRepo.getById(bobPid)?.muted).toBe(true);
    aliceSock.close();
    bobSock.close();
  });

  it('AC-12: muted participant\'s chat:send is silently dropped', async () => {
    await claim(bound.server, 'alice');
    await claim(bound.server, 'bob');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    await joinRoom(bound.server, 'bob', room.id);

    const aliceSock = await openSocket(bound.wsBase, room.id);
    await helloAndDrain(aliceSock, room.id, 'alice');
    const bobSock = await openSocket(bound.wsBase, room.id);
    await helloAndDrain(bobSock, room.id, 'bob');
    await aliceSock.recvWhere((f) => f.type === 'presence' && f.connected === true && f.participantId !== '');

    // Mute bob.
    await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/mute`,
      payload: { handle: 'alice', target: 'bob', muted: true }
    });
    await aliceSock.recvWhere((f) => f.type === 'mute_state');
    await bobSock.recvWhere((f) => f.type === 'mute_state');

    // Bob tries to chat — no broadcast follows.
    bobSock.send({ type: 'chat:send', roomId: room.id, text: 'silenced' });
    await delay(60);

    const aliceFrames = aliceSock.drained();
    const bobFrames = bobSock.drained();
    expect(aliceFrames.find((f) => f.type === 'chat:message')).toBeUndefined();
    expect(bobFrames.find((f) => f.type === 'chat:message')).toBeUndefined();

    // No chat audit row was written.
    const chats = bound.server.sessionEvents.listByRoom(room.id, { kinds: ['chat'] });
    expect(chats).toHaveLength(0);

    aliceSock.close();
    bobSock.close();
  });

  it('AC-12: muted participant\'s lock:acquire is silently rejected', async () => {
    await claim(bound.server, 'alice');
    await claim(bound.server, 'bob');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    await joinRoom(bound.server, 'bob', room.id);

    const aliceSock = await openSocket(bound.wsBase, room.id);
    await helloAndDrain(aliceSock, room.id, 'alice');
    const bobSock = await openSocket(bound.wsBase, room.id);
    await helloAndDrain(bobSock, room.id, 'bob');
    await aliceSock.recvWhere((f) => f.type === 'presence' && f.connected === true && f.participantId !== '');

    await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/mute`,
      payload: { handle: 'alice', target: 'bob', muted: true }
    });
    await bobSock.recvWhere((f) => f.type === 'mute_state');
    await aliceSock.recvWhere((f) => f.type === 'mute_state');

    bobSock.send({ type: 'lock:acquire', roomId: room.id });
    await delay(60);

    const lockStates = [...aliceSock.drained(), ...bobSock.drained()].filter(
      (f) => f.type === 'lock:state'
    );
    expect(lockStates).toHaveLength(0);

    aliceSock.close();
    bobSock.close();
  });

  it('unmute restores chat + lock abilities', async () => {
    await claim(bound.server, 'alice');
    await claim(bound.server, 'bob');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    await joinRoom(bound.server, 'bob', room.id);

    const bobSock = await openSocket(bound.wsBase, room.id);
    await helloAndDrain(bobSock, room.id, 'bob');

    // Mute then unmute.
    await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/mute`,
      payload: { handle: 'alice', target: 'bob', muted: true }
    });
    await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/mute`,
      payload: { handle: 'alice', target: 'bob', muted: false }
    });
    await bobSock.recvWhere((f) => f.type === 'mute_state' && f.muted === false);

    bobSock.send({ type: 'chat:send', roomId: room.id, text: 'back online' });
    const message = await bobSock.recvWhere((f) => f.type === 'chat:message');
    if (message.type === 'chat:message') expect(message.text).toBe('back online');
    bobSock.close();
  });

  it('cannot mute the PH (400)', async () => {
    await claim(bound.server, 'alice');
    await claim(bound.server, 'bob');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    await joinRoom(bound.server, 'bob', room.id);
    // Promote bob to co_host so bob is allowed to call /mute.
    await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/promote`,
      payload: { handle: 'alice', target: 'bob', to_tier: 'co_host' }
    });

    const res = await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/mute`,
      payload: { handle: 'bob', target: 'alice', muted: true }
    });
    expect(res.statusCode).toBe(400);
    expect((res.json() as { error: string }).error).toBe('cannot_mute_primary_host');
  });

  it('CoHost cannot mute peer CoHost (403)', async () => {
    await claim(bound.server, 'alice');
    await claim(bound.server, 'bob');
    await claim(bound.server, 'carol');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    await joinRoom(bound.server, 'bob', room.id);
    await joinRoom(bound.server, 'carol', room.id);
    for (const target of ['bob', 'carol']) {
      await bound.server.app.inject({
        method: 'POST',
        url: `/api/rooms/${room.id}/promote`,
        payload: { handle: 'alice', target, to_tier: 'co_host' }
      });
    }

    const res = await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/mute`,
      payload: { handle: 'bob', target: 'carol', muted: true }
    });
    expect(res.statusCode).toBe(403);
  });
});
