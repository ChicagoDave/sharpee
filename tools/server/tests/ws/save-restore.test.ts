/**
 * End-to-end save + restore over WebSocket + real Deno sandbox.
 *
 * Behavior Statement — save / restore round-trip
 *   DOES:
 *     - On client `save` from a primary_host: the server runs a SAVE against
 *       the sandbox, stores the blob in the saves table, appends a 'save'
 *       session_events row, and broadcasts `save_created` to every connected
 *       client in the room.
 *     - A reconnecting client receives the save in its `welcome.room.saves`.
 *     - On client `restore { save_id }`: the server fetches the stored blob,
 *       round-trips it through the sandbox (RESTORE → RESTORED), appends a
 *       'restore' event, and broadcasts `restored` to every connected client
 *       in the room.
 *   WHEN: two sockets are connected to the same room, backed by real Deno
 *         running `dungeo.sharpee`.
 *   BECAUSE: AC2 — two users reach the same post-restore state after
 *            disconnect/reconnect; ADR-153 D2/D10/D11. The assertion must
 *            survive replacement with the production spawn path — no canned
 *            `stub-save:<id>` blob, no canned "Restored." text block.
 *   REJECTS WHEN: a Participant (not Command Entrant+) attempts `save` —
 *                 sender receives `error { code: 'insufficient_authority' }`
 *                 and no save row is created.
 *
 * Gating: this suite is gated on `SHARPEE_REAL_SANDBOX=1` because it spawns
 * Deno and compiles a real bundle for the save/restore round-trip tests.
 * CI sets the env var; local dev can too (once `deno` is installed) or
 * skip silently.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildTestServer,
  createRoomViaHttp,
  joinRoomViaHttp,
  type TestServerHandle,
} from '../helpers/test-server.js';
import { openWsClient, type TestWsClient } from '../helpers/ws-client.js';
import type { ServerMsg } from '../../src/wire/browser-server.js';

const REAL = Boolean(process.env.SHARPEE_REAL_SANDBOX);

interface Room {
  host: Awaited<ReturnType<typeof createRoomViaHttp>>;
  guest: Awaited<ReturnType<typeof joinRoomViaHttp>>;
  hostClient: TestWsClient;
  guestClient: TestWsClient;
}

async function openBothSockets(server: TestServerHandle): Promise<Room> {
  const host = await createRoomViaHttp(server, {
    story_slug: 'dungeo',
    display_name: 'Alice',
  });
  const guest = await joinRoomViaHttp(server, host.room_id, 'Bob');

  // HTTP handlers left participants marked connected; force disconnected so
  // the WS `hello` performs a full reconnect (matching the Phase 4 tests).
  server.db
    .prepare('UPDATE participants SET connected = 0 WHERE room_id = ?')
    .run(host.room_id);

  const hostClient = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
  const guestClient = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
  hostClient.send({ kind: 'hello', username: host.username, secret: host.secret });
  guestClient.send({ kind: 'hello', username: guest.username, secret: guest.secret });
  await hostClient.waitFor(
    (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome'
  );
  await guestClient.waitFor(
    (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome'
  );
  return { host, guest, hostClient, guestClient };
}

describe.skipIf(!REAL)('save + restore round-trip (real sandbox)', () => {
  let server: TestServerHandle;
  let openClients: TestWsClient[];

  beforeEach(async () => {
    server = await buildTestServer({ stories: ['dungeo'], realSandbox: true });
    openClients = [];
  });
  afterEach(async () => {
    for (const c of openClients) c.close();
    await server.close();
  });

  function track<T extends TestWsClient>(c: T): T {
    openClients.push(c);
    return c;
  }

  it('primary_host save: both clients receive save_created; saves row + session event persisted', async () => {
    const { host, hostClient, guestClient } = await openBothSockets(server);
    track(hostClient);
    track(guestClient);

    hostClient.send({ kind: 'save' });

    const hostSaved = await hostClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'save_created' }> => m.kind === 'save_created',
      30_000,
    );
    const guestSaved = await guestClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'save_created' }> => m.kind === 'save_created',
      30_000,
    );

    expect(hostSaved.save_id).toBe(guestSaved.save_id);
    expect(hostSaved.actor_id).toBe(host.participant_id);
    // Name format: `${story_slug} — T${turn_number} — ${ISO_timestamp}`.
    // Real engine on fresh spawn has turn_number = 0, but keep the regex
    // tolerant in case the format evolves.
    expect(hostSaved.name).toMatch(/^dungeo — T\d+ — \d{4}-\d{2}-\d{2}T/);

    // DB row exists with real engine state blob — not the stub's short
    // canned string. Mirror the acceptance gate's size floor (blob_b64 > 500
    // becomes blob bytes > 375 after base64 decode — floor at 300 for slack).
    const row = server.db
      .prepare('SELECT save_id, room_id, actor_id, name, blob FROM saves WHERE save_id = ?')
      .get(hostSaved.save_id) as
      | { save_id: string; room_id: string; actor_id: string; name: string; blob: Buffer }
      | undefined;
    expect(row).toBeDefined();
    expect(row!.room_id).toBe(host.room_id);
    expect(row!.actor_id).toBe(host.participant_id);
    expect(row!.blob.length).toBeGreaterThan(300);

    // Session event row appended, referencing the same save_id
    const ev = server.db
      .prepare(
        "SELECT participant_id, payload FROM session_events WHERE room_id = ? AND kind = 'save'"
      )
      .all(host.room_id) as Array<{ participant_id: string | null; payload: string }>;
    expect(ev.length).toBe(1);
    expect(ev[0]!.participant_id).toBe(host.participant_id);
    expect(JSON.parse(ev[0]!.payload)).toMatchObject({
      kind: 'save',
      save_id: hostSaved.save_id,
      save_name: hostSaved.name,
    });
  }, 60_000);

  it('reconnecting client sees the save in welcome.room.saves', async () => {
    const { host, guest, hostClient, guestClient } = await openBothSockets(server);
    track(hostClient);

    hostClient.send({ kind: 'save' });
    const saved = await guestClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'save_created' }> => m.kind === 'save_created',
      30_000,
    );

    // Guest disconnects and reconnects
    guestClient.close();
    server.db
      .prepare('UPDATE participants SET connected = 0 WHERE participant_id = ?')
      .run(guest.participant_id);

    const guest2 = track(await openWsClient(`${server.wsUrl}/ws/${host.room_id}`));
    guest2.send({ kind: 'hello', username: guest.username, secret: guest.secret });
    const welcome = await guest2.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome'
    );

    expect(welcome.room.saves.map((s) => s.save_id)).toContain(saved.save_id);
    expect(welcome.room.saves.find((s) => s.save_id === saved.save_id)!.name).toBe(
      saved.name
    );
  }, 60_000);

  it('primary_host restore: both clients receive restored with text_blocks', async () => {
    const { host, hostClient, guestClient } = await openBothSockets(server);
    track(hostClient);
    track(guestClient);

    // First, save
    hostClient.send({ kind: 'save' });
    const saved = await hostClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'save_created' }> => m.kind === 'save_created',
      30_000,
    );
    await guestClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'save_created' }> => m.kind === 'save_created',
      30_000,
    );

    // Then restore
    hostClient.send({ kind: 'restore', save_id: saved.save_id });

    const hostRestored = await hostClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'restored' }> => m.kind === 'restored',
      30_000,
    );
    const guestRestored = await guestClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'restored' }> => m.kind === 'restored',
      30_000,
    );

    expect(hostRestored.save_id).toBe(saved.save_id);
    expect(hostRestored.actor_id).toBe(host.participant_id);
    // Real RESTORED from deno-entry emits an empty text_blocks array (the
    // restore itself does not render scene text — the next command does).
    // The stub's canned [{ kind: 'para', text: 'Restored.' }] is gone.
    expect(Array.isArray(hostRestored.text_blocks)).toBe(true);
    expect(guestRestored.save_id).toBe(saved.save_id);

    // A 'restore' session_event row exists
    const ev = server.db
      .prepare(
        "SELECT participant_id, payload FROM session_events WHERE room_id = ? AND kind = 'restore'"
      )
      .all(host.room_id) as Array<{ participant_id: string | null; payload: string }>;
    expect(ev.length).toBe(1);
    expect(ev[0]!.participant_id).toBe(host.participant_id);
    expect(JSON.parse(ev[0]!.payload)).toMatchObject({
      kind: 'restore',
      save_id: saved.save_id,
    });
  }, 60_000);

  it('Participant save attempt: insufficient_authority to sender; no save row, no broadcast', async () => {
    const { host, hostClient, guestClient } = await openBothSockets(server);
    track(hostClient);
    track(guestClient);

    // Guest is a plain `participant` by default
    guestClient.send({ kind: 'save' });

    const err = await guestClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'error' }> => m.kind === 'error'
    );
    expect(err.code).toBe('insufficient_authority');

    // Host did NOT receive save_created
    await new Promise((r) => setTimeout(r, 50));
    expect(
      hostClient.received.some((m) => m.kind === 'save_created')
    ).toBe(false);

    // No save row in DB
    const saves = server.db
      .prepare('SELECT COUNT(*) as c FROM saves WHERE room_id = ?')
      .get(host.room_id) as { c: number };
    expect(saves.c).toBe(0);
  });

  it('restore after a typist lock is active: lock_state(null) broadcast to both clients', async () => {
    const { host, hostClient, guestClient } = await openBothSockets(server);
    track(hostClient);
    track(guestClient);

    // Create a save first
    hostClient.send({ kind: 'save' });
    const saved = await hostClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'save_created' }> => m.kind === 'save_created',
      30_000,
    );
    await guestClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'save_created' }> => m.kind === 'save_created',
      30_000,
    );

    // Host starts typing — acquires the lock
    hostClient.send({ kind: 'draft_delta', seq: 1, text: 'look' });
    await guestClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'lock_state' }> =>
        m.kind === 'lock_state' && m.holder_id === host.participant_id
    );

    // Host restores — lock should clear
    hostClient.send({ kind: 'restore', save_id: saved.save_id });

    await hostClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'restored' }> => m.kind === 'restored',
      30_000,
    );
    const lockCleared = await guestClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'lock_state' }> =>
        m.kind === 'lock_state' && m.holder_id === null
    );
    expect(lockCleared.holder_id).toBeNull();
    expect(server.ws.locks.getState(host.room_id).holder_id).toBeNull();
  }, 60_000);
});
