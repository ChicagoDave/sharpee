/**
 * AC-10 — lock-on-typing (400ms expiry, 200ms heartbeat).
 *
 * ADR-177 §AC-10:
 *   - Acquiring transitions broadcast `lock:state` to all sockets.
 *   - Same-holder heartbeats DO NOT rebroadcast (only "meaningful"
 *     transitions ship a frame).
 *   - A different holder's `lock:acquire` while held is silently
 *     rejected (no broadcast, no error).
 *   - After `expiryMs` of no heartbeats, the server auto-releases and
 *     broadcasts `lock:state { holder: null, expiresAt: null }`.
 *   - Explicit `lock:release` from the holder collapses the lock
 *     immediately.
 *
 * REAL-PATH: spawned server, real `ws`. Production defaults
 * (400ms / 200ms) per AC; no test-only overrides.
 */

import { test, expect } from '@playwright/test';
import { spawnZifmiaServer, type ZifmiaProcess } from './helpers/server';
import { claimIdentity, createRoom, joinRoom } from './helpers/api';
import { openAndHello, type E2eSocket, type ServerFrameLike } from './helpers/ws';

const LOCK_EXPIRY_MS = 400;

let server: ZifmiaProcess;

test.beforeAll(async () => {
  server = await spawnZifmiaServer();
});

test.afterAll(async () => {
  await server.stop();
});

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isLockState(f: ServerFrameLike): boolean {
  return f.type === 'lock:state';
}

async function drainLockState(sock: E2eSocket): Promise<void> {
  // Best-effort drain; ignore the timeout because none-pending is fine.
  try {
    await sock.recvWhere(isLockState, 50);
  } catch {
    // none queued
  }
}

test('AC-10: acquire broadcasts; same-holder heartbeat does not; explicit release collapses', async () => {
  await claimIdentity(server.baseURL, 'roma');
  await claimIdentity(server.baseURL, 'sasa');
  const { room } = await createRoom(server.baseURL, 'roma', 'dungeo', 'Lock Heartbeat');
  await joinRoom(server.baseURL, room.id, 'sasa');

  const a = await openAndHello(server.baseURL, room.id, 'roma');
  const b = await openAndHello(server.baseURL, room.id, 'sasa');

  // First acquire from A → broadcast { holder: A }.
  a.sock.send({ type: 'lock:acquire', roomId: room.id });
  const acquireOnB = await b.sock.recvWhere(isLockState);
  expect(acquireOnB).toMatchObject({ holder: a.ack.participantId });
  expect((acquireOnB as { expiresAt: number | null }).expiresAt).toBeGreaterThan(Date.now());

  // Heartbeat from A → no rebroadcast.
  a.sock.send({ type: 'lock:acquire', roomId: room.id });
  await expect(b.sock.recvWhere(isLockState, 100)).rejects.toThrow(/timed out/);

  // Explicit release from A → broadcast { holder: null }.
  a.sock.send({ type: 'lock:release', roomId: room.id });
  const releaseOnB = await b.sock.recvWhere(isLockState);
  expect(releaseOnB).toMatchObject({ holder: null, expiresAt: null });

  a.sock.close();
  b.sock.close();
});

test('AC-10: foreign-holder acquire while held is silently rejected', async () => {
  await claimIdentity(server.baseURL, 'tina');
  await claimIdentity(server.baseURL, 'umar');
  const { room } = await createRoom(server.baseURL, 'tina', 'dungeo', 'Lock Foreign');
  await joinRoom(server.baseURL, room.id, 'umar');

  const a = await openAndHello(server.baseURL, room.id, 'tina');
  const b = await openAndHello(server.baseURL, room.id, 'umar');

  // A acquires.
  a.sock.send({ type: 'lock:acquire', roomId: room.id });
  await b.sock.recvWhere(isLockState);
  await a.sock.recvWhere(isLockState);

  // B tries to acquire — rejected, no broadcast. A then releases —
  // the NEXT lock:state on B's queue should be the release (holder=null),
  // never a `holder = B.participantId` from a stray accept.
  b.sock.send({ type: 'lock:acquire', roomId: room.id });
  await sleep(50);
  a.sock.send({ type: 'lock:release', roomId: room.id });

  const next = await b.sock.recvWhere(isLockState);
  expect(next).toMatchObject({ holder: null });
  expect((next as { holder: string | null }).holder).not.toBe(b.ack.participantId);

  a.sock.close();
  b.sock.close();
});

test('AC-10: auto-release fires after expiry; B can then acquire', async () => {
  await claimIdentity(server.baseURL, 'vera');
  await claimIdentity(server.baseURL, 'wynn');
  const { room } = await createRoom(server.baseURL, 'vera', 'dungeo', 'Lock Expiry');
  await joinRoom(server.baseURL, room.id, 'wynn');

  const a = await openAndHello(server.baseURL, room.id, 'vera');
  const b = await openAndHello(server.baseURL, room.id, 'wynn');

  // A acquires and then stops heartbeating.
  a.sock.send({ type: 'lock:acquire', roomId: room.id });
  await b.sock.recvWhere(isLockState);
  await a.sock.recvWhere(isLockState);

  // After expiry, both receive lock:state { holder: null }.
  const autoReleaseTimeout = LOCK_EXPIRY_MS + 400;
  const releaseOnB = await b.sock.recvWhere(isLockState, autoReleaseTimeout);
  expect(releaseOnB).toMatchObject({ holder: null, expiresAt: null });
  await a.sock.recvWhere(isLockState, 500);

  // B now acquires successfully.
  await drainLockState(b.sock);
  await drainLockState(a.sock);
  b.sock.send({ type: 'lock:acquire', roomId: room.id });
  const acquireOnA = await a.sock.recvWhere(isLockState);
  expect(acquireOnA).toMatchObject({ holder: b.ack.participantId });

  a.sock.close();
  b.sock.close();
});
