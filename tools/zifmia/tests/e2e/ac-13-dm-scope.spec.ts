/**
 * AC-13 — DM scope.
 *
 * ADR-177 §AC-13: a DM (POST /api/rooms/:id/dm) is delivered only to
 * sockets in the {primary_host, co_host} tiers. Non-PH/CoHost senders
 * receive 403; demotion stops subsequent DM access.
 *
 * REAL-PATH: spawned server, HTTP only. The "delivery scope" check
 * (non-host sockets don't receive the dm:message frame) needs WS and
 * is covered in the AC-12/AC-6 specs that already wire WS clients.
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

test('AC-13: participant POST /dm returns 403', async () => {
  await claimIdentity(server.baseURL, 'phil');
  await claimIdentity(server.baseURL, 'jess');
  const { room } = await createRoom(server.baseURL, 'phil', 'dungeo', 'DM Scope');
  await joinRoom(server.baseURL, room.id, 'jess');

  const res = await rawPost(server.baseURL, `/api/rooms/${room.id}/dm`, {
    handle: 'jess',
    text: 'hello hosts'
  });
  expect(res.status).toBe(403);
  expect(res.body).toEqual({ error: 'forbidden' });
});

test('AC-13: PH POST /dm returns 200 with id+ts', async () => {
  await claimIdentity(server.baseURL, 'pete');
  const { room } = await createRoom(server.baseURL, 'pete', 'dungeo', 'DM PH');

  const res = await rawPost(server.baseURL, `/api/rooms/${room.id}/dm`, {
    handle: 'pete',
    text: 'PH says hi'
  });
  expect(res.status).toBe(200);
  const body = res.body as { id: string; ts: number };
  expect(typeof body.id).toBe('string');
  expect(body.id.length).toBeGreaterThan(0);
  expect(typeof body.ts).toBe('number');
});

test('AC-13: CoHost can DM; demotion to participant revokes access', async () => {
  await claimIdentity(server.baseURL, 'olive');
  await claimIdentity(server.baseURL, 'penny');
  const { room } = await createRoom(server.baseURL, 'olive', 'dungeo', 'CoHost DM');
  await joinRoom(server.baseURL, room.id, 'penny');

  // PH promotes penny to co_host.
  const promote = await rawPost(server.baseURL, `/api/rooms/${room.id}/promote`, {
    handle: 'olive',
    target: 'penny',
    to_tier: 'co_host'
  });
  expect(promote.status).toBe(200);

  // CoHost DM → 200.
  const coHostDm = await rawPost(server.baseURL, `/api/rooms/${room.id}/dm`, {
    handle: 'penny',
    text: 'co-host channel'
  });
  expect(coHostDm.status).toBe(200);

  // Demote back to participant.
  const demote = await rawPost(server.baseURL, `/api/rooms/${room.id}/demote`, {
    handle: 'olive',
    target: 'penny',
    to_tier: 'participant'
  });
  expect(demote.status).toBe(200);

  // After demotion → 403.
  const afterDm = await rawPost(server.baseURL, `/api/rooms/${room.id}/dm`, {
    handle: 'penny',
    text: 'still here?'
  });
  expect(afterDm.status).toBe(403);
  expect(afterDm.body).toEqual({ error: 'forbidden' });
});

test('AC-13: invalid text shapes are rejected with 400', async () => {
  await claimIdentity(server.baseURL, 'quinn');
  const { room } = await createRoom(server.baseURL, 'quinn', 'dungeo', 'DM Validation');

  const empty = await rawPost(server.baseURL, `/api/rooms/${room.id}/dm`, {
    handle: 'quinn',
    text: ''
  });
  expect(empty.status).toBe(400);
  expect(empty.body).toEqual({ error: 'invalid_text' });

  const tooLong = await rawPost(server.baseURL, `/api/rooms/${room.id}/dm`, {
    handle: 'quinn',
    text: 'x'.repeat(1001)
  });
  expect(tooLong.status).toBe(400);
  expect(tooLong.body).toEqual({ error: 'invalid_text' });
});
