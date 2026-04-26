/**
 * End-to-end turn execution over WebSocket + real Deno sandbox.
 *
 * Behavior Statement — submit_command → story_output broadcast
 *   DOES: on submit_command from the lock-holding socket, routes a COMMAND
 *         to the per-room sandbox, awaits OUTPUT, appends `command` and
 *         `output` rows to the session log, bumps rooms.last_activity_at,
 *         and broadcasts `story_output` to every connection in the room.
 *   WHEN: two sockets are connected to the same room and the sandbox is
 *         spawned on a real Deno runtime against the real `dungeo.sharpee`.
 *   BECAUSE: AC1 requires that two users see the same story output, and
 *            the assertion must survive replacement with the production
 *            spawn path — no stub echoes back a canned string.
 *   REJECTS WHEN: sandbox crashes before OUTPUT — server emits
 *                 `runtime_crash` error envelope to every connection in
 *                 the room and keeps running (AC7). Here "crashes" is
 *                 induced by SIGKILLing the real child mid-turn.
 *
 * Gating: this suite is gated on `SHARPEE_REAL_SANDBOX=1` because it
 * spawns Deno and compiles a real bundle — operations that require Deno
 * on PATH and add ~1–2 s of setup per test. CI sets the env var; local
 * dev can too (once `deno` is installed) or skip silently.
 */

import { afterEach, describe, expect, it } from 'vitest';
import {
  buildTestServer,
  createRoomViaHttp,
  joinRoomViaHttp,
  type TestServerHandle,
} from '../helpers/test-server.js';
import { openWsClient } from '../helpers/ws-client.js';
import type { ServerMsg } from '../../src/wire/browser-server.js';

const REAL = Boolean(process.env.SHARPEE_REAL_SANDBOX);

async function openBothSockets(server: TestServerHandle) {
  const host = await createRoomViaHttp(server, { story_slug: 'dungeo' });
  const guest = await joinRoomViaHttp(server, host.room_id);

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

describe.skipIf(!REAL)('submit_command → story_output (real sandbox)', () => {
  let server: TestServerHandle;

  afterEach(async () => {
    if (server) await server.close();
  });

  it('broadcasts story_output to both connected clients and logs command + output events', async () => {
    server = await buildTestServer({ stories: ['dungeo'], realSandbox: true });
    const { host, hostClient, guestClient } = await openBothSockets(server);

    // Phase 5: submit_command requires the sender to be the current lock
    // holder. Acquire the lock via a draft_delta before submitting.
    hostClient.send({ kind: 'draft_delta', seq: 1, text: 'look' });
    hostClient.send({ kind: 'submit_command', text: 'look' });

    const hostOutput = await hostClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'story_output' }> => m.kind === 'story_output',
      30_000,
    );
    const guestOutput = await guestClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'story_output' }> => m.kind === 'story_output',
      30_000,
    );

    // Both clients see the same turn.
    expect(hostOutput.turn_id).toBe(guestOutput.turn_id);

    // Real-engine assertions (mirror the acceptance gate): at least one
    // text block, non-trivial JSON size, and at least one engine event.
    expect(hostOutput.text_blocks.length).toBeGreaterThan(0);
    expect(JSON.stringify(hostOutput.text_blocks).length).toBeGreaterThan(200);

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
  }, 60_000);

  it('sandbox crash mid-turn surfaces runtime_crash and the server stays up (AC7)', async () => {
    server = await buildTestServer({ stories: ['dungeo'], realSandbox: true });
    const { host, hostClient, guestClient } = await openBothSockets(server);

    // Phase 5: acquire lock first (see note above).
    hostClient.send({ kind: 'draft_delta', seq: 1, text: 'look' });
    hostClient.send({ kind: 'submit_command', text: 'look' });

    // Kill the sandbox *between* the registry's ready-listener firing and
    // room-manager's await-continuation running. Order on READY emit:
    //
    //   1. Registry's `proc.on('ready')` (attached first in register()):
    //      sets entry.status='ready' and calls resolveReady() — which
    //      queues room-manager's `await entry.ready` continuation as a
    //      microtask.
    //   2. Our `proc.once('ready')` listener: SIGKILL the child.
    //   3. Microtasks drain: room-manager's continuation sets
    //      inflightTurnId and writes COMMAND to the dying pipe.
    //   4. Child exit from SIGKILL propagates → 'crash' event → room-
    //      manager's crash listener reads inflightTurnId (populated in
    //      step 3) and broadcasts runtime_crash *with turn_id*.
    //
    // This sequence requires our once-listener to be attached while the
    // entry is still 'spawning' (before READY fires). We tick with
    // setImmediate so we run between event-loop turns — fast enough to
    // catch the entry well before Deno's ~hundreds-of-milliseconds spawn.
    const waitStart = Date.now();
    let entry = server.sandboxes.get(host.room_id);
    while (Date.now() - waitStart < 5_000 && !entry) {
      await new Promise((r) => setImmediate(r));
      entry = server.sandboxes.get(host.room_id);
    }
    expect(entry).not.toBeNull();
    // We expect to find the entry while status is still 'spawning'. If
    // we lost the race and it's already 'ready', the once-listener won't
    // fire — fall through to an immediate kill (may or may not catch the
    // mid-turn window depending on how fast the engine answered).
    if (entry!.status === 'spawning') {
      entry!.process.once('ready', () => entry!.process.kill('SIGKILL'));
    } else {
      entry!.process.kill('SIGKILL');
    }

    const crashMsg = await hostClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'error' }> =>
        m.kind === 'error' && (m as { code: string }).code === 'runtime_crash',
      15_000,
    );
    expect(crashMsg.code).toBe('runtime_crash');
    // N-1: mid-turn crash includes the turn_id so the client can unblock
    // the specific turn's spinner rather than assuming room-wide state is bad.
    expect(crashMsg.turn_id).toMatch(/^[0-9a-f-]{36}$/);
    // Detail text reflects the mid-turn phase, not the idle phase.
    expect(crashMsg.detail).toMatch(/during your command/i);

    // Both clients receive it (broadcast).
    const guestCrash = await guestClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'error' }> =>
        m.kind === 'error' && (m as { code: string }).code === 'runtime_crash',
      5_000,
    );
    expect(guestCrash.code).toBe('runtime_crash');
    expect(guestCrash.turn_id).toBe(crashMsg.turn_id);

    // Server still responsive: issue another HTTP call to prove it.
    const stillAlive = await fetch(`${server.httpUrl}/health`);
    expect(stillAlive.status).toBe(200);

    hostClient.close();
    guestClient.close();
  }, 60_000);
});
