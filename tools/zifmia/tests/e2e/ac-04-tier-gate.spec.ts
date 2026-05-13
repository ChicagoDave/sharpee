/**
 * AC-4 — tier-gated abilities.
 *
 * ADR-177 §AC-4: "A `participant`'s `POST /api/rooms/:id/pin
 * { pinned: true }` returns 403; the same request from the PH
 * succeeds."
 *
 * REAL-PATH: spawned server, HTTP only.
 */

import { test, expect } from '@playwright/test';
import { spawnZifmiaServer, type ZifmiaProcess } from './helpers/server';
import { claimIdentity, createRoom, joinRoom, rawPost } from './helpers/api';

let server: ZifmiaProcess;

test.beforeAll(async () => {
  server = await spawnZifmiaServer();
});

test.afterAll(async () => {
  await server.stop();
});

test('AC-4: participant pin returns 403; PH pin returns 200', async () => {
  await claimIdentity(server.baseURL, 'host');
  await claimIdentity(server.baseURL, 'guest');

  const { room } = await createRoom(server.baseURL, 'host', 'dungeo', 'Tier Gate');
  const joined = await joinRoom(server.baseURL, room.id, 'guest');
  expect(joined.participant.tier).toBe('participant');

  // Participant pin → forbidden.
  const guestPin = await rawPost(server.baseURL, `/api/rooms/${room.id}/pin`, {
    handle: 'guest',
    pinned: true
  });
  expect(guestPin.status).toBe(403);
  expect(guestPin.body).toEqual({ error: 'forbidden' });

  // PH pin → succeeds.
  const hostPin = await rawPost(server.baseURL, `/api/rooms/${room.id}/pin`, {
    handle: 'host',
    pinned: true
  });
  expect(hostPin.status).toBe(200);
  expect((hostPin.body as { room: { pinned: boolean } }).room.pinned).toBe(true);
});

test('AC-4: unknown-handle on a gated route returns 401, not 403', async () => {
  await claimIdentity(server.baseURL, 'mary');
  const { room } = await createRoom(server.baseURL, 'mary', 'dungeo', 'Auth Probe');

  const ghostPin = await rawPost(server.baseURL, `/api/rooms/${room.id}/pin`, {
    handle: 'phantom',
    pinned: true
  });
  expect(ghostPin.status).toBe(401);
  expect(ghostPin.body).toEqual({ error: 'unknown_handle' });
});

test('AC-4: non-member identity on a gated route returns 403 not_in_room', async () => {
  await claimIdentity(server.baseURL, 'john');
  await claimIdentity(server.baseURL, 'outsider');
  const { room } = await createRoom(server.baseURL, 'john', 'dungeo', 'Outsider Probe');

  const outsiderPin = await rawPost(server.baseURL, `/api/rooms/${room.id}/pin`, {
    handle: 'outsider',
    pinned: true
  });
  expect(outsiderPin.status).toBe(403);
  expect(outsiderPin.body).toEqual({ error: 'not_in_room' });
});
