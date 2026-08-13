/**
 * AC-5 cascading succession — REAL-PATH against the Fastify+WS stack
 * with a small `graceMs` so the timer fires within the test budget.
 *
 * Covers:
 *   - PH disconnect → grace timer + presence frame with graceDeadline
 *   - Grace expiry → successor promoted to PH, prior PH demoted to participant
 *   - role_change WS broadcast for both old and new tier assignments
 *   - is_successor flag clears on new PH; next-in-line inherits it
 *   - Grace cancellation: PH reconnects before deadline → no promotion
 *   - rooms.primary_host_id updated to the new PH's identity_id
 *   - Cascading: nominated successor is offline → next connected candidate is promoted
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
const TEST_GRACE_MS = 80;

async function helloAndDrainPresence(sock: TestSocket, roomId: string, handle: string): Promise<string> {
  sock.send({ type: 'hello', roomId, handle });
  const ack = await sock.recv();
  expect(ack.type).toBe('hello:ack');
  const pid = ack.type === 'hello:ack' ? ack.participantId : '';
  await sock.recvWhere((f) => f.type === 'presence' && f.connected === true && f.participantId === pid);
  return pid;
}

describe('AC-5 cascading succession (REAL-PATH)', () => {
  let bound: BoundServer;

  beforeEach(async () => {
    bound = await startBoundServer({
      dbFile: ':memory:',
      stories: STORIES,
      helloTimeoutMs: 5000,
      lockExpiryMs: 1000,
      graceMs: TEST_GRACE_MS,
      recycleManualOnly: true
    });
  });

  afterEach(async () => {
    await bound.close();
  });

  it('AC-5: PH disconnect + grace → nominated successor promoted; rows reflect new state; role_change broadcast', async () => {
    const aliceId = await claim(bound.server, 'alice');
    const bobId = await claim(bound.server, 'bob');
    const carolId = await claim(bound.server, 'carol');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    const bobPid = await joinRoom(bound.server, 'bob', room.id);
    const carolPid = await joinRoom(bound.server, 'carol', room.id);

    // PH nominates bob as successor.
    const nom = await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/nominate-successor`,
      payload: { handle: 'alice', target: 'bob' }
    });
    expect(nom.statusCode).toBe(200);

    // All three connect WS.
    const aliceSock = await openSocket(bound.wsBase, room.id);
    const alicePid = await helloAndDrainPresence(aliceSock, room.id, 'alice');
    const bobSock = await openSocket(bound.wsBase, room.id);
    await helloAndDrainPresence(bobSock, room.id, 'bob');
    const carolSock = await openSocket(bound.wsBase, room.id);
    await helloAndDrainPresence(carolSock, room.id, 'carol');

    // Drain extra presence broadcasts on alice + bob.
    await aliceSock.recvWhere((f) => f.type === 'presence' && f.participantId === bobPid);
    await aliceSock.recvWhere((f) => f.type === 'presence' && f.participantId === carolPid);
    await bobSock.recvWhere((f) => f.type === 'presence' && f.participantId === carolPid);

    // Alice (PH) disconnects.
    aliceSock.close();
    await aliceSock.awaitClose();

    // Bob and Carol see: presence{connected:false} from the hub, then
    // presence{connected:false, graceDeadline} from the succession service.
    const grace = await bobSock.recvWhere(
      (f) => f.type === 'presence' &&
             f.participantId === alicePid &&
             f.connected === false &&
             typeof f.graceDeadline === 'number'
    );
    if (grace.type === 'presence') {
      expect(grace.graceDeadline).toBeGreaterThan(Date.now());
    }

    // Wait for grace to elapse → succession runs.
    const bobRC = await bobSock.recvWhere(
      (f) => f.type === 'role_change' && f.participantId === bobPid && f.tier === 'primary_host',
      TEST_GRACE_MS + 500
    );
    expect(bobRC.type).toBe('role_change');

    const aliceRC = await bobSock.recvWhere(
      (f) => f.type === 'role_change' && f.participantId === alicePid && f.tier === 'participant',
      500
    );
    expect(aliceRC.type).toBe('role_change');

    // Persistent state: rooms.primary_host_id == bob.identityId; tiers flipped.
    const room2 = bound.server.roomsRepo.getRoom(room.id);
    expect(room2?.primary_host_id).toBe(bobId);
    expect(bound.server.participantsRepo.getById(bobPid)?.tier).toBe('primary_host');
    expect(bound.server.participantsRepo.getById(carolPid)?.tier).toBe('participant');

    // is_successor: bob's flag cleared (he's PH now); carol inherits.
    expect(bound.server.participantsRepo.getById(bobPid)?.is_successor).toBe(false);
    expect(bound.server.participantsRepo.getById(carolPid)?.is_successor).toBe(true);

    bobSock.close();
    carolSock.close();
    // Silence unused warnings for aliceId / carolId.
    void aliceId; void carolId;
  });

  it('grace cancellation: PH reconnects before deadline → no promotion', async () => {
    await claim(bound.server, 'alice');
    await claim(bound.server, 'bob');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    const bobPid = await joinRoom(bound.server, 'bob', room.id);

    const aliceSock1 = await openSocket(bound.wsBase, room.id);
    const alicePid = await helloAndDrainPresence(aliceSock1, room.id, 'alice');
    const bobSock = await openSocket(bound.wsBase, room.id);
    await helloAndDrainPresence(bobSock, room.id, 'bob');
    await aliceSock1.recvWhere((f) => f.type === 'presence' && f.participantId === bobPid);

    // PH disconnects.
    aliceSock1.close();
    await aliceSock1.awaitClose();

    // grace presence frame arrives at bob.
    await bobSock.recvWhere(
      (f) => f.type === 'presence' && f.participantId === alicePid && typeof f.graceDeadline === 'number'
    );

    // PH reconnects BEFORE grace elapses.
    const aliceSock2 = await openSocket(bound.wsBase, room.id);
    aliceSock2.send({ type: 'hello', roomId: room.id, handle: 'alice' });
    const ack = await aliceSock2.recv();
    expect(ack.type).toBe('hello:ack');
    if (ack.type === 'hello:ack') expect(ack.tier).toBe('primary_host'); // still PH

    // Wait past TEST_GRACE_MS — bob should NOT receive a role_change.
    await delay(TEST_GRACE_MS + 50);
    const drained = bobSock.drained();
    const rolePromotions = drained.filter(
      (f) => f.type === 'role_change' && f.tier === 'primary_host'
    );
    expect(rolePromotions).toHaveLength(0);

    // Tier remains the same.
    expect(bound.server.participantsRepo.getByRoomAndIdentity(room.id, bound.server.identityRepo.getByHandle('alice')!.id)?.tier).toBe('primary_host');
    expect(bound.server.succession.isGracePending(room.id)).toBe(false);

    aliceSock2.close();
    bobSock.close();
  });

  it('chain: nominated successor is offline → next connected candidate promoted', async () => {
    await claim(bound.server, 'alice');
    const bobId = await claim(bound.server, 'bob');
    const carolId = await claim(bound.server, 'carol');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    const bobPid = await joinRoom(bound.server, 'bob', room.id);
    const carolPid = await joinRoom(bound.server, 'carol', room.id);

    // PH nominates bob, but bob never connects WS (offline).
    await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/nominate-successor`,
      payload: { handle: 'alice', target: 'bob' }
    });

    const aliceSock = await openSocket(bound.wsBase, room.id);
    await helloAndDrainPresence(aliceSock, room.id, 'alice');
    const carolSock = await openSocket(bound.wsBase, room.id);
    await helloAndDrainPresence(carolSock, room.id, 'carol');
    await aliceSock.recvWhere((f) => f.type === 'presence' && f.participantId === carolPid);

    aliceSock.close();
    await aliceSock.awaitClose();

    // Wait for grace + succession. Carol (connected) is promoted even
    // though Bob was nominated, because Bob isn't connected.
    const carolRC = await carolSock.recvWhere(
      (f) => f.type === 'role_change' && f.participantId === carolPid && f.tier === 'primary_host',
      TEST_GRACE_MS + 500
    );
    expect(carolRC.type).toBe('role_change');

    expect(bound.server.roomsRepo.getRoom(room.id)?.primary_host_id).toBe(carolId);
    expect(bound.server.participantsRepo.getById(bobPid)?.tier).toBe('participant');
    expect(bound.server.participantsRepo.getById(carolPid)?.tier).toBe('primary_host');

    carolSock.close();
    void bobId;
  });

  it('chain dies: no connected non-PH participants → no succession (room left empty)', async () => {
    await claim(bound.server, 'alice');
    await claim(bound.server, 'bob');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    await joinRoom(bound.server, 'bob', room.id);
    // Bob does NOT connect WS.

    const aliceSock = await openSocket(bound.wsBase, room.id);
    await helloAndDrainPresence(aliceSock, room.id, 'alice');
    aliceSock.close();
    await aliceSock.awaitClose();

    await delay(TEST_GRACE_MS + 80);

    // Alice still listed as PH in the DB — chain died, no promotion.
    const aliceId = bound.server.identityRepo.getByHandle('alice')!.id;
    expect(bound.server.roomsRepo.getRoom(room.id)?.primary_host_id).toBe(aliceId);
    expect(bound.server.succession.isGracePending(room.id)).toBe(false);
  });
});
