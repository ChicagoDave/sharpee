/**
 * AC-6 — transport split.
 *
 * ADR-177 §AC-6:
 *   - WS client→server: ONLY `hello`, `chat:send`, `lock:acquire`,
 *     `lock:release`.
 *   - WS server→client: ONLY `hello:ack`, `chat:message`, `lock:state`,
 *     `turn`, `role_change`, `presence`, `room_restored`, `mute_state`,
 *     `dm:message`.
 *   - HTTP carries identity/rooms/saves/stories/state/command; the
 *     `POST /command` response is just `{ turnId }`.
 *   - No HTTP route returns a `TurnPacket` outside the `GET /state`
 *     transcript-backlog payload.
 *
 * REAL-PATH: spawned server; HTTP via `fetch`; WS via `ws`.
 */

import { test, expect } from '@playwright/test';
import { spawnZifmiaServer, type ZifmiaProcess } from './helpers/server';
import { claimIdentity, createRoom, getJSON, rawPost } from './helpers/api';
import { openAndHello } from './helpers/ws';

const ALLOWED_SERVER_FRAMES = new Set([
  'hello:ack',
  'chat:message',
  'lock:state',
  'turn',
  'role_change',
  'presence',
  'room_restored',
  'mute_state',
  'dm:message'
]);

let server: ZifmiaProcess;

test.beforeAll(async () => {
  server = await spawnZifmiaServer();
});

test.afterAll(async () => {
  await server.stop();
});

test('AC-6: POST /command response body is exactly { turnId }', async () => {
  await claimIdentity(server.baseURL, 'xena');
  const { room } = await createRoom(server.baseURL, 'xena', 'dungeo', 'Transport Body');

  const res = await rawPost(server.baseURL, `/api/rooms/${room.id}/command`, {
    handle: 'xena',
    text: 'look'
  });
  expect(res.status).toBe(200);

  const body = res.body as Record<string, unknown>;
  expect(Object.keys(body).sort()).toEqual(['turnId']);
  expect(typeof body.turnId).toBe('string');
  // Defensive: no TurnPacket fields leaked through the HTTP body.
  expect(body).not.toHaveProperty('packet');
  expect(body).not.toHaveProperty('channels');
  expect(body).not.toHaveProperty('submitter');
});

test('AC-6: TurnPacket is delivered via WS `turn` frame, not via HTTP', async () => {
  await claimIdentity(server.baseURL, 'yara');
  const { room } = await createRoom(server.baseURL, 'yara', 'dungeo', 'Transport WS');

  const { sock } = await openAndHello(server.baseURL, room.id, 'yara');

  const res = await rawPost(server.baseURL, `/api/rooms/${room.id}/command`, {
    handle: 'yara',
    text: 'look'
  });
  expect(res.status).toBe(200);
  const { turnId } = res.body as { turnId: string };

  const turnFrame = await sock.recvWhere((f) => f.type === 'turn');
  expect(turnFrame).toMatchObject({
    type: 'turn',
    roomId: room.id,
    turnId,
    submitter: { handle: 'yara' }
  });
  // The TurnPacket structure must be on the WS frame.
  expect(turnFrame).toHaveProperty('packet');
  const packet = (turnFrame as { packet?: { channels?: unknown } }).packet;
  expect(packet).toBeDefined();
  expect(packet).toHaveProperty('channels');

  sock.close();
});

test('AC-6: every WS frame observed during a session is in the allowed-set', async () => {
  await claimIdentity(server.baseURL, 'zora');
  const { room } = await createRoom(server.baseURL, 'zora', 'dungeo', 'Transport Frames');

  const { sock } = await openAndHello(server.baseURL, room.id, 'zora');
  // hello:ack was already drained inside openAndHello.

  // Exercise chat, lock, and turn.
  sock.send({ type: 'chat:send', roomId: room.id, text: 'hi' });
  await sock.recvWhere((f) => f.type === 'chat:message');

  sock.send({ type: 'lock:acquire', roomId: room.id });
  await sock.recvWhere((f) => f.type === 'lock:state');

  sock.send({ type: 'lock:release', roomId: room.id });
  await sock.recvWhere((f) => f.type === 'lock:state' && (f as { holder?: unknown }).holder === null);

  await rawPost(server.baseURL, `/api/rooms/${room.id}/command`, {
    handle: 'zora',
    text: 'look'
  });
  await sock.recvWhere((f) => f.type === 'turn');

  // Anything still queued must also be in the allowed set.
  for (const f of sock.drained()) {
    expect(ALLOWED_SERVER_FRAMES).toContain(f.type);
  }

  sock.close();
});

test('AC-6: GET /state is the only HTTP surface that exposes channel payloads', async () => {
  await claimIdentity(server.baseURL, 'amee');
  const { room } = await createRoom(server.baseURL, 'amee', 'dungeo', 'Transport State');

  // Issue a command so transcript_backlog has content.
  const cmd = await rawPost(server.baseURL, `/api/rooms/${room.id}/command`, {
    handle: 'amee',
    text: 'look'
  });
  expect(cmd.status).toBe(200);

  type StateResponse = {
    room: { id: string };
    transcript_backlog: Array<{ turnId: string; channels: Record<string, unknown[]> }>;
  };
  const state = await getJSON<StateResponse>(
    server.baseURL,
    `/api/rooms/${room.id}/state?handle=amee`
  );
  expect(state.transcript_backlog.length).toBeGreaterThan(0);
  // Each backlog entry has `channels` (the channel map). This is the
  // sanctioned HTTP exposure of channel payloads.
  for (const t of state.transcript_backlog) {
    expect(typeof t.turnId).toBe('string');
    expect(t.channels).toBeTruthy();
  }

  // Sanity: /api/rooms list does NOT include channels.
  const lobby = await getJSON<{ rooms: Array<Record<string, unknown>> }>(
    server.baseURL,
    '/api/rooms'
  );
  for (const r of lobby.rooms) {
    expect(r).not.toHaveProperty('channels');
    expect(r).not.toHaveProperty('packet');
  }
});

test('AC-6: WS pre-hello with a non-hello frame closes 4005', async () => {
  await claimIdentity(server.baseURL, 'bart');
  const { room } = await createRoom(server.baseURL, 'bart', 'dungeo', 'Transport Hello');

  const { openSocket } = await import('./helpers/ws');
  const sock = await openSocket(server.baseURL, room.id);
  // Send a non-hello frame first; server must close 4005.
  sock.send({ type: 'chat:send', roomId: room.id, text: 'too soon' });
  const close = await sock.awaitClose();
  expect(close.code).toBe(4005);
});
