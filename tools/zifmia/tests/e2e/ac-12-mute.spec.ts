/**
 * AC-12 — mute enforcement.
 *
 * ADR-177 §AC-12: a muted participant's `chat:send` is dropped server-
 * side (no broadcast); their `lock:acquire` is silently rejected. The
 * intent is silent suppression; no error frame is returned to the
 * muted client.
 *
 * REAL-PATH: spawned server, real WS clients for host + guest +
 * bystander.
 *
 * Negative-assertion pattern: rather than waiting for a timeout to
 * prove "no frame arrived," we send a marker frame from a non-muted
 * participant and assert it arrives first. If the muted participant's
 * frame had been broadcast, it would have arrived before the marker
 * since frames preserve send order through the hub.
 */

import { test, expect } from '@playwright/test';
import { spawnZifmiaServer, type ZifmiaProcess } from './helpers/server';
import { claimIdentity, createRoom, joinRoom, rawPost } from './helpers/api';
import { openAndHello } from './helpers/ws';

let server: ZifmiaProcess;

test.beforeAll(async () => {
  server = await spawnZifmiaServer();
});

test.afterAll(async () => {
  await server.stop();
});

test('AC-12: muted chat:send is dropped; non-muted chat is delivered', async () => {
  await claimIdentity(server.baseURL, 'hank');
  await claimIdentity(server.baseURL, 'gary');
  await claimIdentity(server.baseURL, 'bess');
  const { room } = await createRoom(server.baseURL, 'hank', 'dungeo', 'Mute Chat');
  await joinRoom(server.baseURL, room.id, 'gary');
  await joinRoom(server.baseURL, room.id, 'bess');

  const host = await openAndHello(server.baseURL, room.id, 'hank');
  const guest = await openAndHello(server.baseURL, room.id, 'gary');
  const bystander = await openAndHello(server.baseURL, room.id, 'bess');

  // Sanity check: guest can chat before being muted.
  guest.sock.send({ type: 'chat:send', roomId: room.id, text: 'pre-mute hello' });
  const preMute = await bystander.sock.recvWhere((f) => f.type === 'chat:message');
  expect(preMute).toMatchObject({ type: 'chat:message', fromHandle: 'gary', text: 'pre-mute hello' });

  // Drain host's pre-mute message (it was broadcast to all).
  await host.sock.recvWhere((f) => f.type === 'chat:message' && (f as { text?: string }).text === 'pre-mute hello');

  // Host mutes guest.
  const mute = await rawPost(server.baseURL, `/api/rooms/${room.id}/mute`, {
    handle: 'hank',
    target: 'gary',
    muted: true
  });
  expect(mute.status).toBe(200);

  // Mute-state broadcast must reach bystander.
  const muteFrame = await bystander.sock.recvWhere((f) => f.type === 'mute_state');
  expect(muteFrame).toMatchObject({
    type: 'mute_state',
    participantId: guest.ack.participantId,
    muted: true
  });

  // Drain host's mute_state too.
  await host.sock.recvWhere((f) => f.type === 'mute_state');
  // And guest's own copy (server doesn't filter mute_state from the muted user).
  await guest.sock.recvWhere((f) => f.type === 'mute_state');

  // Muted guest sends a chat; non-muted host sends a marker after.
  guest.sock.send({ type: 'chat:send', roomId: room.id, text: 'muted whisper' });
  host.sock.send({ type: 'chat:send', roomId: room.id, text: 'host marker' });

  // Bystander should see the marker as the next chat:message — never the muted whisper.
  const next = await bystander.sock.recvWhere((f) => f.type === 'chat:message');
  expect(next).toMatchObject({ type: 'chat:message', fromHandle: 'hank', text: 'host marker' });

  // Defensive: no buffered chat:message in the queue with the muted text.
  const tail = bystander.sock.drained().filter((f) => f.type === 'chat:message');
  for (const f of tail) {
    expect((f as { text?: string }).text).not.toBe('muted whisper');
  }

  host.sock.close();
  guest.sock.close();
  bystander.sock.close();
});

test('AC-12: muted participant cannot acquire the lock; non-muted PH can', async () => {
  await claimIdentity(server.baseURL, 'iris');
  await claimIdentity(server.baseURL, 'jack');
  const { room } = await createRoom(server.baseURL, 'iris', 'dungeo', 'Mute Lock');
  await joinRoom(server.baseURL, room.id, 'jack');

  const ph = await openAndHello(server.baseURL, room.id, 'iris');
  const muted = await openAndHello(server.baseURL, room.id, 'jack');

  // Mute jack.
  const mute = await rawPost(server.baseURL, `/api/rooms/${room.id}/mute`, {
    handle: 'iris',
    target: 'jack',
    muted: true
  });
  expect(mute.status).toBe(200);

  // Drain mute_state broadcasts on PH's socket so the next frame
  // assertion is unambiguous.
  await ph.sock.recvWhere((f) => f.type === 'mute_state');

  // Muted jack tries to acquire; immediately PH acquires. PH's
  // lock:state should land with holder = PH's participantId, never
  // jack's.
  muted.sock.send({ type: 'lock:acquire', roomId: room.id });
  ph.sock.send({ type: 'lock:acquire', roomId: room.id });

  const lockFrame = await ph.sock.recvWhere((f) => f.type === 'lock:state');
  expect(lockFrame).toMatchObject({
    type: 'lock:state',
    holder: ph.ack.participantId
  });
  expect((lockFrame as { holder?: string | null }).holder).not.toBe(muted.ack.participantId);

  ph.sock.close();
  muted.sock.close();
});
