/**
 * AC-13 DM scope (PH ↔ Co-Host only) — REAL-PATH against WS server.
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

describe('AC-13 DM scope (REAL-PATH)', () => {
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

  it('PH can send DM; only PH + CoHost sockets receive dm:message', async () => {
    await claim(bound.server, 'alice');
    await claim(bound.server, 'bob');
    await claim(bound.server, 'carol');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    await joinRoom(bound.server, 'bob', room.id);
    await joinRoom(bound.server, 'carol', room.id);
    await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/promote`,
      payload: { handle: 'alice', target: 'bob', to_tier: 'co_host' }
    });

    const aliceSock = await openSocket(bound.wsBase, room.id);
    await helloAndDrain(aliceSock, room.id, 'alice');
    const bobSock = await openSocket(bound.wsBase, room.id);
    await helloAndDrain(bobSock, room.id, 'bob');
    const carolSock = await openSocket(bound.wsBase, room.id);
    await helloAndDrain(carolSock, room.id, 'carol');

    // PH sends a DM.
    const res = await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/dm`,
      payload: { handle: 'alice', text: 'sidebar' }
    });
    expect(res.statusCode).toBe(200);

    // alice (PH) and bob (CoHost) get the dm:message.
    const aliceDm = await aliceSock.recvWhere((f) => f.type === 'dm:message');
    const bobDm = await bobSock.recvWhere((f) => f.type === 'dm:message');
    if (aliceDm.type === 'dm:message') expect(aliceDm.text).toBe('sidebar');
    if (bobDm.type === 'dm:message') expect(bobDm.text).toBe('sidebar');

    // Carol (participant) sees NO dm:message frame within the window.
    await delay(60);
    const carolFrames = carolSock.drained();
    expect(carolFrames.find((f) => f.type === 'dm:message')).toBeUndefined();

    aliceSock.close();
    bobSock.close();
    carolSock.close();
  });

  it('AC-13: participant /dm → 403', async () => {
    await claim(bound.server, 'alice');
    await claim(bound.server, 'bob');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    await joinRoom(bound.server, 'bob', room.id);

    const res = await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/dm`,
      payload: { handle: 'bob', text: 'hey' }
    });
    expect(res.statusCode).toBe(403);
  });

  it('AC-13: demoted CoHost stops seeing subsequent DMs', async () => {
    await claim(bound.server, 'alice');
    await claim(bound.server, 'bob');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    await joinRoom(bound.server, 'bob', room.id);
    await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/promote`,
      payload: { handle: 'alice', target: 'bob', to_tier: 'co_host' }
    });

    const aliceSock = await openSocket(bound.wsBase, room.id);
    await helloAndDrain(aliceSock, room.id, 'alice');
    const bobSock = await openSocket(bound.wsBase, room.id);
    await helloAndDrain(bobSock, room.id, 'bob');

    // Bob (CoHost) gets first DM.
    await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/dm`,
      payload: { handle: 'alice', text: 'before' }
    });
    const first = await bobSock.recvWhere((f) => f.type === 'dm:message');
    if (first.type === 'dm:message') expect(first.text).toBe('before');

    // Demote Bob to participant.
    await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/demote`,
      payload: { handle: 'alice', target: 'bob', to_tier: 'participant' }
    });
    await bobSock.recvWhere((f) => f.type === 'role_change');

    // Second DM — bob no longer sees it.
    await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/dm`,
      payload: { handle: 'alice', text: 'after' }
    });
    await delay(60);
    const bobFrames = bobSock.drained();
    expect(bobFrames.find((f) => f.type === 'dm:message')).toBeUndefined();

    // Alice still sees both (in session_events audit).
    const dmRows = bound.server.sessionEvents.listByRoom(room.id, { kinds: ['dm'] });
    expect(dmRows).toHaveLength(2);
    aliceSock.close();
    bobSock.close();
  });

  it('rejects empty / oversize text with 400', async () => {
    await claim(bound.server, 'alice');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');

    for (const text of ['', 'x'.repeat(1001), 42, undefined]) {
      const res = await bound.server.app.inject({
        method: 'POST',
        url: `/api/rooms/${room.id}/dm`,
        payload: { handle: 'alice', text }
      });
      expect(res.statusCode).toBe(400);
    }
  });

  it('muted CoHost cannot send DMs (403)', async () => {
    await claim(bound.server, 'alice');
    await claim(bound.server, 'bob');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    await joinRoom(bound.server, 'bob', room.id);
    await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/promote`,
      payload: { handle: 'alice', target: 'bob', to_tier: 'co_host' }
    });
    await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/mute`,
      payload: { handle: 'alice', target: 'bob', muted: true }
    });

    const res = await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/dm`,
      payload: { handle: 'bob', text: 'whisper' }
    });
    expect(res.statusCode).toBe(403);
    expect((res.json() as { error: string }).error).toBe('muted');
  });
});
