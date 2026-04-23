/**
 * WebSocket presence broadcast behavior tests.
 *
 * Behavior Statement — connection lifecycle
 *   DOES: a new socket's hello causes every other connected socket in the
 *         same room to receive `presence(connected=true)`; a socket close
 *         causes remaining peers to receive `presence(connected=false)`
 *         and appends a `leave(disconnect)` event to session_events;
 *         flipping participants.connected to 0 on close.
 *   WHEN: two or more sockets are connected to the same room.
 *   BECAUSE: presence is the foundation for the roster UI, lock-release
 *            on disconnect (Phase 5), and PH succession (Phase 7).
 *   REJECTS WHEN: N/A — presence always broadcasts.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildTestServer,
  createRoomViaHttp,
  joinRoomViaHttp,
  type TestServerHandle,
} from '../helpers/test-server.js';
import { openWsClient } from '../helpers/ws-client.js';
import type { ServerMsg } from '../../src/wire/browser-server.js';

describe('WebSocket presence broadcast', () => {
  let server: TestServerHandle;

  beforeEach(async () => {
    server = await buildTestServer({ stories: ['zork'] });
  });
  afterEach(async () => {
    await server.close();
  });

  it('second participant connecting causes the first to receive presence(connected=true)', async () => {
    const host = await createRoomViaHttp(server, { story_slug: 'zork', display_name: 'Alice' });
    const guest = await joinRoomViaHttp(server, host.room_id, 'Bob');

    // Flip connected flags off so the hello handshake has real work to do.
    server.db
      .prepare('UPDATE participants SET connected = 0 WHERE room_id = ?')
      .run(host.room_id);

    const hostClient = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    try {
      hostClient.send({ kind: 'hello', token: host.token });
      await hostClient.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome'
      );

      const guestClient = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
      try {
        guestClient.send({ kind: 'hello', token: guest.token });
        await guestClient.waitFor(
          (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome'
        );

        const presence = await hostClient.waitFor(
          (m): m is Extract<ServerMsg, { kind: 'presence' }> =>
            m.kind === 'presence' && (m as { participant_id: string }).participant_id === guest.participant_id
        );
        expect(presence.connected).toBe(true);
      } finally {
        guestClient.close();
      }
    } finally {
      hostClient.close();
    }
  });

  it('participant disconnecting causes the remaining peer to receive presence(connected=false); session_events gets a leave row', async () => {
    const host = await createRoomViaHttp(server, { story_slug: 'zork', display_name: 'Alice' });
    const guest = await joinRoomViaHttp(server, host.room_id, 'Bob');

    server.db
      .prepare('UPDATE participants SET connected = 0 WHERE room_id = ?')
      .run(host.room_id);

    const hostClient = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    const guestClient = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    try {
      hostClient.send({ kind: 'hello', token: host.token });
      guestClient.send({ kind: 'hello', token: guest.token });
      await hostClient.waitFor((m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome');
      await guestClient.waitFor((m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome');

      // Host sees Bob arrive.
      await hostClient.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'presence' }> =>
          m.kind === 'presence' && (m as { participant_id: string }).participant_id === guest.participant_id
      );

      guestClient.close();

      const leavePush = await hostClient.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'presence' }> =>
          m.kind === 'presence' &&
          (m as { participant_id: string }).participant_id === guest.participant_id &&
          (m as { connected: boolean }).connected === false
      );
      expect(leavePush.connected).toBe(false);

      // Small grace for the close-triggered DB work to commit.
      await new Promise((r) => setTimeout(r, 50));

      const connectedNow = (server.db
        .prepare('SELECT connected FROM participants WHERE participant_id = ?')
        .get(guest.participant_id) as { connected: number }).connected;
      expect(connectedNow).toBe(0);

      const leaveCount = (server.db
        .prepare('SELECT COUNT(*) AS n FROM session_events WHERE room_id = ? AND kind = ?')
        .get(host.room_id, 'leave') as { n: number }).n;
      expect(leaveCount).toBeGreaterThanOrEqual(1);
    } finally {
      hostClient.close();
    }
  });

  it('PH disconnect: presence broadcast carries a future grace_deadline ISO timestamp', async () => {
    // Use a short grace window so the pending setTimeout doesn't keep the
    // test-server open at teardown.
    await server.close();
    server = await buildTestServer({
      stories: ['zork'],
      phGraceTimerOptions: { timeoutMs: 200 },
    });
    const host = await createRoomViaHttp(server, {
      story_slug: 'zork',
      display_name: 'Alice',
    });
    const guest = await joinRoomViaHttp(server, host.room_id, 'Bob');

    server.db
      .prepare('UPDATE participants SET connected = 0 WHERE room_id = ?')
      .run(host.room_id);

    const hostClient = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    const guestClient = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    try {
      hostClient.send({ kind: 'hello', token: host.token });
      guestClient.send({ kind: 'hello', token: guest.token });
      await hostClient.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome',
      );
      await guestClient.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome',
      );

      const before = Date.now();
      hostClient.close();
      const leave = await guestClient.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'presence' }> =>
          m.kind === 'presence' &&
          (m as { participant_id: string }).participant_id === host.participant_id &&
          (m as { connected: boolean }).connected === false,
      );
      expect(leave.grace_deadline).not.toBeNull();
      const deadlineMs = Date.parse(leave.grace_deadline as string);
      expect(Number.isNaN(deadlineMs)).toBe(false);
      // Must be in the future relative to the close we just issued.
      expect(deadlineMs).toBeGreaterThan(before);
    } finally {
      guestClient.close();
    }
  });

  it('non-PH disconnect: presence.grace_deadline is null', async () => {
    const host = await createRoomViaHttp(server, {
      story_slug: 'zork',
      display_name: 'Alice',
    });
    const guest = await joinRoomViaHttp(server, host.room_id, 'Bob');

    server.db
      .prepare('UPDATE participants SET connected = 0 WHERE room_id = ?')
      .run(host.room_id);

    const hostClient = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    const guestClient = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    try {
      hostClient.send({ kind: 'hello', token: host.token });
      guestClient.send({ kind: 'hello', token: guest.token });
      await hostClient.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome',
      );
      await guestClient.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome',
      );

      guestClient.close();
      const leave = await hostClient.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'presence' }> =>
          m.kind === 'presence' &&
          (m as { participant_id: string }).participant_id === guest.participant_id &&
          (m as { connected: boolean }).connected === false,
      );
      expect(leave.grace_deadline).toBeNull();
    } finally {
      hostClient.close();
    }
  });

  it('connection registry is cleaned up after close (no leak across connect cycles)', async () => {
    const host = await createRoomViaHttp(server, { story_slug: 'zork', display_name: 'Alice' });
    server.db
      .prepare('UPDATE participants SET connected = 0 WHERE participant_id = ?')
      .run(host.participant_id);

    for (let i = 0; i < 3; i++) {
      const client = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
      client.send({ kind: 'hello', token: host.token });
      await client.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome'
      );
      client.close();
      await client.waitForClose();
      // Small yield so the server's close handler completes.
      await new Promise((r) => setTimeout(r, 20));
    }

    expect(server.ws.connections.size()).toBe(0);
    expect(server.ws.connections.getConnectedCount(host.room_id)).toBe(0);
  });
});
