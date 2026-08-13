/**
 * AC-9 — erase frees the handle (+ WS 4007 teardown).
 *
 * ADR-177 §AC-9: "POST /api/identities/erase { handle } hard-deletes
 * the row; subsequent POST /api/identities { handle: <same> } succeeds
 * with a new id. Any WS connection attached to the erased handle is
 * closed by the server with code 4007 identity_erased before the HTTP
 * response returns to the caller."
 *
 * REAL-PATH: spawned server, real `ws` library, real HTTP.
 */

import { test, expect } from '@playwright/test';
import { spawnZifmiaServer, type ZifmiaProcess } from './helpers/server';
import { claimIdentity, createRoom, rawPost } from './helpers/api';
import { openAndHello } from './helpers/ws';

let server: ZifmiaProcess;

test.beforeAll(async () => {
  server = await spawnZifmiaServer();
});

test.afterAll(async () => {
  await server.stop();
});

test('AC-9: erase deletes the row; re-claim succeeds with a new id', async () => {
  const first = await claimIdentity(server.baseURL, 'erin');
  expect(first.handle).toBe('erin');

  const eraseRes = await rawPost(server.baseURL, '/api/identities/erase', { handle: 'erin' });
  expect(eraseRes.status).toBe(200);
  expect(eraseRes.body).toEqual({ erased: true });

  const second = await claimIdentity(server.baseURL, 'erin');
  expect(second.handle).toBe('erin');
  expect(second.id).not.toBe(first.id);

  // Idempotent: erasing a non-existent handle is a no-op.
  const noopErase = await rawPost(server.baseURL, '/api/identities/erase', { handle: 'nobody' });
  expect(noopErase.status).toBe(200);
  expect(noopErase.body).toEqual({ erased: false });
});

test('AC-9: WS attached to the erased identity closes with 4007', async () => {
  const ferb = await claimIdentity(server.baseURL, 'ferb');
  const { room } = await createRoom(server.baseURL, 'ferb', 'dungeo', 'Erase Room');

  const { sock, ack } = await openAndHello(server.baseURL, room.id, 'ferb');
  expect(ack.tier).toBe('primary_host');

  // Race-free: arm the close waiter BEFORE the HTTP request returns.
  const closePromise = sock.awaitClose(3000);

  const erase = await rawPost(server.baseURL, '/api/identities/erase', { handle: 'ferb' });
  expect(erase.status).toBe(200);
  expect(erase.body).toEqual({ erased: true });

  const close = await closePromise;
  expect(close.code).toBe(4007);
});
