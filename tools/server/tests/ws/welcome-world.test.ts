/**
 * End-to-end welcome path with real Deno sandbox (ADR-162 AC-3).
 *
 * Behavior Statement — welcome world acquisition
 *   DOES:
 *     - When the server has a held mirror for the room (set up by a prior
 *       OUTPUT or STATUS), the welcome's RoomSnapshot.world is the
 *       serialized form of that mirror.
 *     - When the server has no held mirror (cold start, fresh room), the
 *       welcome handler issues STATUS_REQUEST to the sandbox, awaits the
 *       STATUS reply, hydrates the mirror, and sends welcome with the
 *       fresh world.
 *   WHEN: a client sends `hello` on a `/ws/:room_id` socket.
 *   BECAUSE: ADR-162 Decision 6 — welcome must carry a non-stale snapshot
 *            so renderer features (status line, map, inventory) have a
 *            world to query on first paint.
 *   REJECTS WHEN: STATUS_REQUEST times out / errors → welcome handler
 *                 closes the socket with `world_snapshot_unavailable`.
 *
 * Gating: SHARPEE_REAL_SANDBOX=1 — spawns Deno + compiles dungeo.sharpee.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildTestServer,
  createRoomViaHttp,
  joinRoomViaHttp,
  type TestServerHandle,
} from '../helpers/test-server.js';
import { openWsClient, type TestWsClient } from '../helpers/ws-client.js';
import { WorldModel } from '@sharpee/world-model';
import type { ServerMsg } from '../../src/wire/browser-server.js';

const REAL = Boolean(process.env.SHARPEE_REAL_SANDBOX);

describe.skipIf(!REAL)('welcome world snapshot (real sandbox)', () => {
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

  it('AC-3 cold start: first hello triggers STATUS_REQUEST; welcome carries hydrate-able world', async () => {
    const host = await createRoomViaHttp(server, { story_slug: 'dungeo' });
    server.db
      .prepare('UPDATE participants SET connected = 0 WHERE participant_id = ?')
      .run(host.participant_id);

    const client = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    openClients.push(client);
    client.send({ kind: 'hello', handle: host.handle, passcode: host.passcode });
    const welcome = await client.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome',
    );

    // The welcome frame carries a non-empty world serialization that
    // round-trips through a fresh WorldModel.
    expect(typeof welcome.room.world).toBe('string');
    expect(welcome.room.world.length).toBeGreaterThan(0);
    const mirror = new WorldModel();
    expect(() => mirror.loadJSON(welcome.room.world)).not.toThrow();
    expect(mirror.getPlayer()).toBeDefined();
  });

  it('AC-3 warm path: second hello after a turn serves welcome from the held mirror', async () => {
    const host = await createRoomViaHttp(server, { story_slug: 'dungeo' });
    const guest = await joinRoomViaHttp(server, host.room_id);
    server.db
      .prepare('UPDATE participants SET connected = 0 WHERE room_id = ?')
      .run(host.room_id);

    // First hello (cold start). Wait for the welcome AND let the opening
    // `look` fire-and-forget run so the held mirror is updated by an OUTPUT.
    const hostClient = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    openClients.push(hostClient);
    hostClient.send({ kind: 'hello', handle: host.handle, passcode: host.passcode });
    await hostClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome',
    );
    // Wait for the opening `look` to land — this updates the held mirror via
    // the persistent OUTPUT-listener attached in spawnFor.
    await hostClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'story_output' }> => m.kind === 'story_output',
    );

    // Second hello. Server should serve welcome from the held mirror without
    // a STATUS_REQUEST round-trip.
    const guestClient = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    openClients.push(guestClient);
    guestClient.send({ kind: 'hello', handle: guest.handle, passcode: guest.passcode });
    const guestWelcome = await guestClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome',
    );

    expect(typeof guestWelcome.room.world).toBe('string');
    expect(guestWelcome.room.world.length).toBeGreaterThan(0);
    const mirror = new WorldModel();
    expect(() => mirror.loadJSON(guestWelcome.room.world)).not.toThrow();
  });
});
