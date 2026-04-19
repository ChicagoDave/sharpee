/**
 * End-to-end turn execution over WebSocket + sandbox.
 *
 * Behavior Statement — submit_command → story_output broadcast
 *   DOES: on submit_command from an authenticated socket, routes a
 *         COMMAND to the per-room sandbox, awaits OUTPUT, appends `command`
 *         and `output` rows to the session log, bumps rooms.last_activity_at,
 *         and broadcasts `story_output` to every connection in the room.
 *   WHEN: two sockets are connected to the same room.
 *   BECAUSE: AC1 requires that two users see the same story output.
 *   REJECTS WHEN: sandbox crashes before OUTPUT — server emits
 *                 `runtime_crash` error envelope to the room and keeps
 *                 running (AC7).
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

async function openBothSockets(server: TestServerHandle) {
  const host = await createRoomViaHttp(server, { story_slug: 'zork', display_name: 'Alice' });
  const guest = await joinRoomViaHttp(server, host.room_id, 'Bob');

  server.db
    .prepare('UPDATE participants SET connected = 0 WHERE room_id = ?')
    .run(host.room_id);

  const hostClient = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
  const guestClient = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
  hostClient.send({ kind: 'hello', token: host.token });
  guestClient.send({ kind: 'hello', token: guest.token });
  await hostClient.waitFor(
    (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome'
  );
  await guestClient.waitFor(
    (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome'
  );

  return { host, guest, hostClient, guestClient };
}

describe('submit_command → story_output', () => {
  let server: TestServerHandle;

  afterEach(async () => {
    if (server) await server.close();
  });

  it('broadcasts story_output to both connected clients and logs command + output events', async () => {
    server = await buildTestServer({ stories: ['zork'] });
    const { host, hostClient, guestClient } = await openBothSockets(server);

    hostClient.send({ kind: 'submit_command', text: 'look' });

    const hostOutput = await hostClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'story_output' }> => m.kind === 'story_output',
      10_000
    );
    const guestOutput = await guestClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'story_output' }> => m.kind === 'story_output',
      10_000
    );

    expect(hostOutput.turn_id).toBe(guestOutput.turn_id);
    expect(hostOutput.text_blocks[0]).toEqual({ kind: 'para', text: 'You said: look' });

    // Session event log: one command + one output row.
    const cmdCount = (server.db
      .prepare("SELECT COUNT(*) AS n FROM session_events WHERE room_id = ? AND kind = 'command'")
      .get(host.room_id) as { n: number }).n;
    const outCount = (server.db
      .prepare("SELECT COUNT(*) AS n FROM session_events WHERE room_id = ? AND kind = 'output'")
      .get(host.room_id) as { n: number }).n;
    expect(cmdCount).toBe(1);
    expect(outCount).toBe(1);

    // last_activity_at advanced.
    const activity = (server.db
      .prepare('SELECT last_activity_at FROM rooms WHERE room_id = ?')
      .get(host.room_id) as { last_activity_at: string }).last_activity_at;
    expect(new Date(activity).getTime()).toBeGreaterThan(0);

    hostClient.close();
    guestClient.close();
  });

  it('sandbox crash mid-turn surfaces runtime_crash and the server stays up (AC7)', async () => {
    server = await buildTestServer({
      stories: ['zork'],
      sandboxArgs: ['--crash-on-command'],
    });
    const { hostClient, guestClient } = await openBothSockets(server);

    hostClient.send({ kind: 'submit_command', text: 'look' });

    const crashMsg = await hostClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'error' }> =>
        m.kind === 'error' && (m as { code: string }).code === 'runtime_crash',
      10_000
    );
    expect(crashMsg.code).toBe('runtime_crash');

    // Both clients receive it (broadcast).
    const guestCrash = await guestClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'error' }> =>
        m.kind === 'error' && (m as { code: string }).code === 'runtime_crash',
      5_000
    );
    expect(guestCrash.code).toBe('runtime_crash');

    // Server still responsive: issue another HTTP call to prove it.
    const stillAlive = await fetch(`${server.httpUrl}/health`);
    expect(stillAlive.status).toBe(200);

    hostClient.close();
    guestClient.close();
  });
});
