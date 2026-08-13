/**
 * WS hello handshake tests — close codes 4001/4003/4004/4005/4006
 * per ADR-177 §3. Real WS sockets via the `ws` client lib against a
 * real Fastify+@fastify/websocket server on an ephemeral port.
 */

import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { CLOSE_CODES } from '../src/ws/types.js';
import {
  startBoundServer,
  openSocket,
  claim,
  createRoom,
  joinRoom,
  type BoundServer
} from './ws-helpers.js';

const STORIES = [{ slug: 'dungeo', path: '/fake/dungeo.sharpee' }] as const;

describe('WS hello handshake (REAL-PATH)', () => {
  let bound: BoundServer;

  beforeEach(async () => {
    bound = await startBoundServer({
      dbFile: ':memory:',
      stories: STORIES,
      helloTimeoutMs: 100 // tighten for tests
    });
  });

  afterEach(async () => {
    await bound.close();
  });

  it('hello → hello:ack with participantId + tier; presence broadcast follows', async () => {
    await claim(bound.server, 'alice');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');

    const sock = await openSocket(bound.wsBase, room.id);
    sock.send({ type: 'hello', roomId: room.id, handle: 'alice' });

    const ack = await sock.recv();
    expect(ack.type).toBe('hello:ack');
    if (ack.type === 'hello:ack') {
      expect(ack.tier).toBe('primary_host');
      expect(ack.lockHolder).toBeNull();
      expect(ack.participantId).toMatch(/^[0-9a-f-]{36}$/i);
    }

    // The next frame should be presence:connected for this participant.
    const presence = await sock.recv();
    expect(presence.type).toBe('presence');
    if (presence.type === 'presence') {
      expect(presence.connected).toBe(true);
    }

    sock.close();
  });

  it('non-hello first frame → close 4005 hello_required', async () => {
    await claim(bound.server, 'alice');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    const sock = await openSocket(bound.wsBase, room.id);
    sock.send({ type: 'chat:send', roomId: room.id, text: 'too early' });

    const closed = await sock.awaitClose();
    expect(closed.code).toBe(CLOSE_CODES.HELLO_REQUIRED);
  });

  it('hello with unknown handle → close 4001 unknown_handle', async () => {
    await claim(bound.server, 'alice');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    const sock = await openSocket(bound.wsBase, room.id);
    sock.send({ type: 'hello', roomId: room.id, handle: 'ghost' });

    const closed = await sock.awaitClose();
    expect(closed.code).toBe(CLOSE_CODES.UNKNOWN_HANDLE);
  });

  it('hello for unknown room → close 4004 room_not_found', async () => {
    await claim(bound.server, 'alice');
    const sock = await openSocket(bound.wsBase, '00000000-0000-0000-0000-000000000000');
    sock.send({
      type: 'hello',
      roomId: '00000000-0000-0000-0000-000000000000',
      handle: 'alice'
    });

    const closed = await sock.awaitClose();
    expect(closed.code).toBe(CLOSE_CODES.ROOM_NOT_FOUND);
  });

  it('hello for an identity not a participant of room → close 4003 not_in_room', async () => {
    await claim(bound.server, 'alice');
    await claim(bound.server, 'outsider');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');

    const sock = await openSocket(bound.wsBase, room.id);
    sock.send({ type: 'hello', roomId: room.id, handle: 'outsider' });

    const closed = await sock.awaitClose();
    expect(closed.code).toBe(CLOSE_CODES.NOT_IN_ROOM);
  });

  it('hello timeout → close 4006 hello_timeout', async () => {
    await claim(bound.server, 'alice');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    const sock = await openSocket(bound.wsBase, room.id);
    // Do not send hello; wait for timeout. helloTimeoutMs = 100ms.

    const closed = await sock.awaitClose();
    expect(closed.code).toBe(CLOSE_CODES.HELLO_TIMEOUT);
  });

  // AC-11 reconnect idempotency: same (room_id, identity_id) → same participant_id.
  it('AC-11: reconnect resolves to the SAME participant_id', async () => {
    await claim(bound.server, 'alice');
    await claim(bound.server, 'bob');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    const bobsParticipantId = await joinRoom(bound.server, 'bob', room.id);

    // First connection.
    const sock1 = await openSocket(bound.wsBase, room.id);
    sock1.send({ type: 'hello', roomId: room.id, handle: 'bob' });
    const ack1 = await sock1.recv();
    expect(ack1.type).toBe('hello:ack');
    if (ack1.type === 'hello:ack') expect(ack1.participantId).toBe(bobsParticipantId);
    sock1.close();
    await sock1.awaitClose();

    // Reconnect — same participantId.
    const sock2 = await openSocket(bound.wsBase, room.id);
    sock2.send({ type: 'hello', roomId: room.id, handle: 'bob' });
    const ack2 = await sock2.recv();
    expect(ack2.type).toBe('hello:ack');
    if (ack2.type === 'hello:ack') expect(ack2.participantId).toBe(bobsParticipantId);
    sock2.close();
  });
});
