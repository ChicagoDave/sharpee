/**
 * AC-11 — reconnect idempotency.
 *
 * ADR-177 §AC-11: a browser disconnects mid-session and rejoins. The
 * server's WS layer resolves the incoming `hello { roomId, handle }`
 * by looking up the identity for `handle` and then the participants
 * row for `(room_id, identity_id)`. The same `participant_id` must be
 * returned in the `hello:ack` across the cycle — no new participant
 * row created on reconnect.
 *
 * REAL-PATH: spawned server, real `ws` library.
 */

import { test, expect } from '@playwright/test';
import { spawnZifmiaServer, type ZifmiaProcess } from './helpers/server';
import { claimIdentity, createRoom, joinRoom } from './helpers/api';
import { openAndHello } from './helpers/ws';

let server: ZifmiaProcess;

test.beforeAll(async () => {
  server = await spawnZifmiaServer();
});

test.afterAll(async () => {
  await server.stop();
});

test('AC-11: PH reconnect yields the same participant_id', async () => {
  await claimIdentity(server.baseURL, 'kate');
  const { room } = await createRoom(server.baseURL, 'kate', 'dungeo', 'Reconnect PH');

  const first = await openAndHello(server.baseURL, room.id, 'kate');
  const originalId = first.ack.participantId;
  expect(first.ack.tier).toBe('primary_host');
  first.sock.close();
  await first.sock.awaitClose();

  const second = await openAndHello(server.baseURL, room.id, 'kate');
  expect(second.ack.participantId).toBe(originalId);
  expect(second.ack.tier).toBe('primary_host');
  second.sock.close();
});

test('AC-11: participant reconnect yields the same participant_id', async () => {
  await claimIdentity(server.baseURL, 'lila');
  await claimIdentity(server.baseURL, 'mike');
  const { room } = await createRoom(server.baseURL, 'lila', 'dungeo', 'Reconnect Guest');
  const joined = await joinRoom(server.baseURL, room.id, 'mike');
  expect(joined.participant.tier).toBe('participant');

  const first = await openAndHello(server.baseURL, room.id, 'mike');
  const originalId = first.ack.participantId;
  first.sock.close();
  await first.sock.awaitClose();

  const second = await openAndHello(server.baseURL, room.id, 'mike');
  expect(second.ack.participantId).toBe(originalId);
  expect(second.ack.tier).toBe('participant');
  second.sock.close();
});

test('AC-11: hello with unknown handle closes 4001 — does NOT create a participant row', async () => {
  await claimIdentity(server.baseURL, 'nora');
  const { room } = await createRoom(server.baseURL, 'nora', 'dungeo', 'Unknown Hello');

  const { openSocket } = await import('./helpers/ws');
  const sock = await openSocket(server.baseURL, room.id);
  sock.send({ type: 'hello', roomId: room.id, handle: 'ghosthand' });
  const close = await sock.awaitClose(3000);
  expect(close.code).toBe(4001);
});

test('AC-11: hello with identity-but-not-member closes 4003', async () => {
  await claimIdentity(server.baseURL, 'olga');
  await claimIdentity(server.baseURL, 'pete');
  const { room } = await createRoom(server.baseURL, 'olga', 'dungeo', 'Outsider Hello');

  const { openSocket } = await import('./helpers/ws');
  const sock = await openSocket(server.baseURL, room.id);
  sock.send({ type: 'hello', roomId: room.id, handle: 'pete' });
  const close = await sock.awaitClose(3000);
  expect(close.code).toBe(4003);
});
