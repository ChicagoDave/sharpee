/**
 * Integration test for PH grace-timer wiring in the WebSocket server.
 *
 * Behavior Statement — grace-timer wiring
 *   DOES:
 *     - On socket-close for the current PH's socket: start the per-room
 *       grace timer (one pending entry keyed by room_id).
 *     - On successful hello for the current PH: cancel the pending entry
 *       for that room.
 *     - On socket-close for any non-PH participant: no grace timer is
 *       scheduled.
 *   WHEN: server is built via buildTestServer with an injected MockClock.
 *   BECAUSE: ADR-153 D6 — PH disconnect starts the 5-minute window, PH
 *            reconnect cancels it.
 *   REJECTS WHEN: this suite does not exercise the fire path — the E2E
 *                 round-trip test covers fire + broadcasts.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildTestServer,
  createRoomViaHttp,
  joinRoomViaHttp,
  type TestServerHandle,
} from '../helpers/test-server.js';
import { openWsClient, type TestWsClient } from '../helpers/ws-client.js';
import {
  createMockClock,
  type MockClock,
} from '../../src/rooms/ph-grace-timer.js';
import type { ServerMsg } from '../../src/wire/browser-server.js';

describe('PH grace-timer wiring (presence + hello)', () => {
  let server: TestServerHandle;
  let clock: MockClock;
  let clients: TestWsClient[];

  beforeEach(async () => {
    clock = createMockClock(0);
    server = await buildTestServer({
      stories: ['zork'],
      phGraceTimerOptions: { timeoutMs: 60_000 },
      phGraceTimerClock: clock,
    });
    clients = [];
  });
  afterEach(async () => {
    for (const c of clients) c.close();
    await server.close();
  });

  function track<T extends TestWsClient>(c: T): T {
    clients.push(c);
    return c;
  }

  async function openAndHello(
    room_id: string,
    creds: { handle: string; passcode: string }
  ): Promise<TestWsClient> {
    const c = track(await openWsClient(`${server.wsUrl}/ws/${room_id}`));
    c.send({ kind: 'hello', handle: creds.handle, passcode: creds.passcode });
    await c.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome'
    );
    return c;
  }

  it('PH socket-close starts the grace timer; pending() lists the room', async () => {
    const host = await createRoomViaHttp(server, {
      story_slug: 'zork',
    });
    const hostClient = await openAndHello(host.room_id, host);

    expect(server.ws.phGraceTimer.pending()).toEqual([]);

    // Force-close the PH's socket; server close handler runs on the other side.
    hostClient.close();

    // Give the server a tick to process the close event.
    await new Promise((r) => setTimeout(r, 50));

    expect(server.ws.phGraceTimer.pending()).toEqual([host.room_id]);
  });

  it('non-PH socket-close does NOT schedule a grace timer', async () => {
    const host = await createRoomViaHttp(server, {
      story_slug: 'zork',
    });
    const guest = await joinRoomViaHttp(server, host.room_id);

    const hostClient = await openAndHello(host.room_id, host);
    const guestClient = await openAndHello(host.room_id, guest);
    // Swallow the auto-nomination successor broadcast so it doesn't leak.
    await hostClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'successor' }> => m.kind === 'successor'
    );

    guestClient.close();
    await new Promise((r) => setTimeout(r, 50));

    expect(server.ws.phGraceTimer.pending()).toEqual([]);

    // Sanity: PH closing still schedules
    hostClient.close();
    await new Promise((r) => setTimeout(r, 50));
    expect(server.ws.phGraceTimer.pending()).toEqual([host.room_id]);
  });

  it('PH reconnect before fire cancels the grace timer', async () => {
    const host = await createRoomViaHttp(server, {
      story_slug: 'zork',
    });
    const hostClient = await openAndHello(host.room_id, host);

    hostClient.close();
    await new Promise((r) => setTimeout(r, 50));
    expect(server.ws.phGraceTimer.pending()).toEqual([host.room_id]);

    // Re-open and re-hello
    await openAndHello(host.room_id, host);

    expect(server.ws.phGraceTimer.pending()).toEqual([]);
  });

  it('mock clock advance past timeoutMs: grace timer fires and clears pending', async () => {
    // Build a two-participant room so there IS a designated successor to promote.
    const host = await createRoomViaHttp(server, {
      story_slug: 'zork',
    });
    const guest = await joinRoomViaHttp(server, host.room_id);

    const hostClient = await openAndHello(host.room_id, host);
    const guestClient = await openAndHello(host.room_id, guest);

    // Guest was auto-nominated on their hello. Drain that broadcast.
    await hostClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'successor' }> => m.kind === 'successor'
    );

    // PH leaves.
    hostClient.close();
    await new Promise((r) => setTimeout(r, 50));
    expect(server.ws.phGraceTimer.pending()).toEqual([host.room_id]);

    // Advance past the window — fires succession.
    clock.advance(60_001);

    // Guest receives the role_change for the new PH (themselves).
    const roleChange = await guestClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'role_change' }> =>
        m.kind === 'role_change' && m.participant_id === guest.participant_id
    );
    expect(roleChange.tier).toBe('primary_host');
    expect(roleChange.actor_id).toBeNull();

    expect(server.ws.phGraceTimer.pending()).toEqual([]);

    // DB: guest's tier is primary_host; rooms.primary_host_id points at guest.
    const guestRow = server.db
      .prepare('SELECT tier FROM participants WHERE participant_id = ?')
      .get(guest.participant_id) as { tier: string };
    expect(guestRow.tier).toBe('primary_host');

    const room = server.db
      .prepare('SELECT primary_host_id FROM rooms WHERE room_id = ?')
      .get(host.room_id) as { primary_host_id: string };
    expect(room.primary_host_id).toBe(guest.participant_id);

    // Old PH's tier is now participant
    const oldPhRow = server.db
      .prepare('SELECT tier FROM participants WHERE participant_id = ?')
      .get(host.participant_id) as { tier: string };
    expect(oldPhRow.tier).toBe('participant');
  });

  it('PH reconnects after grace fired: welcome shows them as participant', async () => {
    const host = await createRoomViaHttp(server, {
      story_slug: 'zork',
    });
    const guest = await joinRoomViaHttp(server, host.room_id);

    const hostClient = await openAndHello(host.room_id, host);
    const guestClient = await openAndHello(host.room_id, guest);
    await hostClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'successor' }> => m.kind === 'successor'
    );

    hostClient.close();
    await new Promise((r) => setTimeout(r, 50));
    clock.advance(60_001);
    // Wait for succession broadcast on the guest socket
    await guestClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'role_change' }> =>
        m.kind === 'role_change' && m.participant_id === guest.participant_id
    );

    // Original PH reconnects
    const reconnect = await openAndHello(host.room_id, host);

    const welcome = reconnect.received.find(
      (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome'
    );
    expect(welcome).toBeDefined();

    const me = welcome!.participants.find(
      (p) => p.participant_id === host.participant_id
    );
    expect(me).toBeDefined();
    expect(me!.tier).toBe('participant');
  });
});
