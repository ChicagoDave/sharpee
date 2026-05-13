/**
 * AC-3 — PH room creation.
 *
 * ADR-177 §AC-3: "A `POST /api/rooms { handle, story_slug, title }`
 * from an identified caller creates the room with the caller as PH
 * (tier=`primary_host`). The response carries the room id and join
 * code."
 *
 * REAL-PATH: spawns `node dist/main.js` and drives over HTTP. No
 * `app.inject`, no `buildServer` import.
 */

import { test, expect } from '@playwright/test';
import { spawnZifmiaServer, type ZifmiaProcess } from './helpers/server';
import { claimIdentity, createRoom, getJSON } from './helpers/api';

let server: ZifmiaProcess;

test.beforeAll(async () => {
  server = await spawnZifmiaServer();
});

test.afterAll(async () => {
  await server.stop();
});

test('AC-3: identified caller creates a room as PH', async () => {
  const alice = await claimIdentity(server.baseURL, 'alice');
  expect(alice.handle).toBe('alice');

  const created = await createRoom(server.baseURL, 'alice', 'dungeo', 'Dragon Run');

  expect(created.room.id).toMatch(/.+/);
  expect(created.room.join_code).toMatch(/^[A-Z0-9-]+$/);
  expect(created.room.title).toBe('Dragon Run');
  expect(created.room.story_slug).toBe('dungeo');
  expect(created.room.primary_host_id).toBe(alice.id);

  expect(created.participant.identity_id).toBe(alice.id);
  expect(created.participant.tier).toBe('primary_host');
  expect(created.participant.muted).toBe(false);

  // Lobby reflects the new room.
  const lobby = await getJSON<{ rooms: Array<{ id: string; title: string }> }>(
    server.baseURL,
    '/api/rooms'
  );
  const found = lobby.rooms.find((r) => r.id === created.room.id);
  expect(found).toBeDefined();
  expect(found?.title).toBe('Dragon Run');

  // Code resolver round-trip.
  const resolved = await getJSON<{ id: string; join_code: string; title: string }>(
    server.baseURL,
    `/api/code/${created.room.join_code}`
  );
  expect(resolved.id).toBe(created.room.id);
  expect(resolved.title).toBe('Dragon Run');
});

test('AC-3: unknown handle is rejected with 401', async () => {
  const res = await fetch(`${server.baseURL}/api/rooms`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ handle: 'ghost', story_slug: 'dungeo', title: 'No One' })
  });
  expect(res.status).toBe(401);
  expect(await res.json()).toEqual({ error: 'unknown_handle' });
});

test('AC-3: unknown story slug is rejected with 422', async () => {
  await claimIdentity(server.baseURL, 'carol');
  const res = await fetch(`${server.baseURL}/api/rooms`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ handle: 'carol', story_slug: 'no-such-story', title: 'Wherever' })
  });
  expect(res.status).toBe(422);
  expect(await res.json()).toEqual({ error: 'unknown_story' });
});
