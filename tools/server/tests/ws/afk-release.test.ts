/**
 * End-to-end AFK release test.
 *
 * Behavior Statement — AfkTimer wired into createWsServer
 *   DOES:
 *     - After a lock holder has gone idle past afkTimeoutMs, the next sweep
 *       (intervalMs) force-releases the lock. All sockets in the room
 *       receive lock_state(holder_id:null). A role(force_release) row is
 *       appended to session_events with participant_id=null (system actor)
 *       and target_participant_id = the prior holder.
 *   WHEN: createWsServer was built with afkTimerOptions and a holder has
 *         not sent a draft_delta within afkTimeoutMs.
 *   BECAUSE: ADR-153 Decision 7 — idle holders must auto-release so other
 *            participants can acquire.
 *   REJECTS WHEN:
 *     - lock is free (no holder)                 → no sweep effect
 *     - holder's last_keystroke_at inside window → no sweep effect
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

describe('AfkTimer wired into WebSocket server', () => {
  let server: TestServerHandle;

  afterEach(async () => {
    if (server) await server.close();
  });

  it('releases an idle holder after afkTimeoutMs + one sweep, broadcasting lock_state(null) to every socket and logging a role(force_release) row', async () => {
    server = await buildTestServer({
      stories: ['zork'],
      // Shrink both knobs so the test finishes in well under a second.
      afkTimerOptions: { intervalMs: 20, afkTimeoutMs: 100 },
    });

    const host = await createRoomViaHttp(server, {
      story_slug: 'zork',
      display_name: 'Alice',
    });
    const guest = await joinRoomViaHttp(server, host.room_id, 'Bob');

    const hostClient = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    const guestClient = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    hostClient.send({ kind: 'hello', handle: host.handle, passcode: host.passcode });
    guestClient.send({ kind: 'hello', handle: guest.handle, passcode: guest.passcode });
    await hostClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome'
    );
    await guestClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome'
    );

    // Host starts typing — acquires the lock, both sockets see lock_state(host).
    hostClient.send({ kind: 'draft_delta', seq: 1, text: 'l' });
    const acquired = await guestClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'lock_state' }> =>
        m.kind === 'lock_state' && m.holder_id === host.participant_id
    );
    expect(acquired.holder_id).toBe(host.participant_id);

    // PRECONDITION: the lock manager believes host is the holder.
    expect(server.ws.locks.getState(host.room_id).holder_id).toBe(host.participant_id);

    // Host idles past afkTimeoutMs. Next sweep (≤ intervalMs later) must
    // force-release. Each socket must receive lock_state(null).
    const hostRelease = await hostClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'lock_state' }> =>
        m.kind === 'lock_state' && m.holder_id === null,
      2_000
    );
    const guestRelease = await guestClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'lock_state' }> =>
        m.kind === 'lock_state' && m.holder_id === null,
      2_000
    );
    expect(hostRelease.holder_id).toBeNull();
    expect(guestRelease.holder_id).toBeNull();

    // POSTCONDITION: LockManager state reflects the release.
    expect(server.ws.locks.getState(host.room_id).holder_id).toBeNull();

    // POSTCONDITION: audit row present — role(force_release), actor=system,
    // target=host.
    const row = server.db
      .prepare(
        `SELECT participant_id, kind, payload
         FROM session_events
         WHERE room_id = ? AND kind = 'role'
         ORDER BY event_id DESC LIMIT 1`
      )
      .get(host.room_id) as
      | { participant_id: string | null; kind: string; payload: string }
      | undefined;
    expect(row).toBeDefined();
    expect(row!.participant_id).toBeNull();
    const payload = JSON.parse(row!.payload) as {
      kind: string;
      op: string;
      target_participant_id: string;
    };
    expect(payload).toMatchObject({
      kind: 'role',
      op: 'force_release',
      target_participant_id: host.participant_id,
    });

    hostClient.close();
    guestClient.close();
  });
});
