/**
 * WebSocket hello — identity credential paths (ADR-161).
 *
 * Behavior Statement — handleHello identity branches
 *   DOES: looks up the identity by case-insensitive handle; verifies the
 *         presented passcode against the stored hash; resolves to a
 *         participant row for (identity, room) — creating one if none
 *         exists. On verified identity, sends `welcome`. On unknown
 *         handle, closes 4001 with `unknown_handle`. On passcode
 *         mismatch, closes 4006 with `bad_passcode`.
 *   WHEN: a fresh socket sends its first frame as
 *         `{ kind: 'hello', handle, passcode }`.
 *   BECAUSE: ADR-161 — identity is the persistent credential; rooms are
 *            joined on demand by an identity already known to the server.
 *   REJECTS WHEN:
 *     - unknown handle               → close 4001 unknown_handle
 *     - passcode hash mismatch       → close 4006 bad_passcode
 *     - hello envelope malformed     → close 4000 hello_required
 *     - identity erased (deleted)    → close 4001 unknown_handle
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildTestServer,
  createRoomViaHttp,
  ensureTestIdentity,
  type TestServerHandle,
} from '../helpers/test-server.js';
import { openWsClient } from '../helpers/ws-client.js';
import type { ServerMsg } from '../../src/wire/browser-server.js';

describe('WebSocket hello — identity credentials (ADR-161)', () => {
  let server: TestServerHandle;

  beforeEach(async () => {
    server = await buildTestServer({ stories: ['zork'] });
  });
  afterEach(async () => {
    await server.close();
  });

  it('valid (handle, passcode) for room participant: welcome with same participant_id', async () => {
    // AC-2 (warm reconnect): a participant who previously joined a room
    // resolves to the same participant_id when their socket comes back.
    const host = await createRoomViaHttp(server, { story_slug: 'zork' });

    server.db
      .prepare('UPDATE participants SET connected = 0 WHERE participant_id = ?')
      .run(host.participant_id);

    const client = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    try {
      client.send({ kind: 'hello', handle: host.handle, passcode: host.passcode });
      const welcome = await client.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome',
      );
      expect(welcome.participant_id).toBe(host.participant_id);

      const connected = (
        server.db
          .prepare('SELECT connected FROM participants WHERE participant_id = ?')
          .get(host.participant_id) as { connected: number }
      ).connected;
      expect(connected).toBe(1);
    } finally {
      client.close();
    }
  });

  it('valid identity, NEW room: creates a participant for (identity, room) on the fly', async () => {
    // ADR-161 hello flow: an identity already known to the server can connect
    // to a room they have not joined via HTTP — the WS hello creates the
    // participant row implicitly.
    const host = await createRoomViaHttp(server, { story_slug: 'zork' });
    const stranger = ensureTestIdentity(server, 'Stranger');

    // Sanity: no participant exists for (stranger.id, host.room_id) before hello.
    const before = server.db
      .prepare('SELECT participant_id FROM participants WHERE identity_id = ? AND room_id = ?')
      .get(stranger.id, host.room_id) as { participant_id: string } | undefined;
    expect(before).toBeUndefined();

    const client = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    try {
      client.send({ kind: 'hello', handle: stranger.handle, passcode: stranger.passcode });
      const welcome = await client.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome',
      );
      expect(welcome.participant_id).toMatch(/^[0-9a-f-]{36}$/);

      // Participant row now exists, bound to the stranger's identity.
      const after = server.db
        .prepare(
          'SELECT participant_id, identity_id, tier FROM participants WHERE identity_id = ? AND room_id = ?',
        )
        .get(stranger.id, host.room_id) as
        | { participant_id: string; identity_id: string; tier: string }
        | undefined;
      expect(after).toBeDefined();
      expect(after!.participant_id).toBe(welcome.participant_id);
      expect(after!.identity_id).toBe(stranger.id);
      expect(after!.tier).toBe('participant');

      // The Handle surfaced on the welcome's roster is sourced from the
      // identity row (ADR-161 Phase F — `ParticipantSummary.handle` replaces
      // the legacy `display_name` field; the participants table never
      // carried a per-room display name).
      const summary = welcome.participants.find(
        (p) => p.participant_id === welcome.participant_id,
      );
      expect(summary?.handle).toBe('Stranger');
    } finally {
      client.close();
    }
  });

  it('same identity reconnecting to same room → same participant_id (AC-2)', async () => {
    const host = await createRoomViaHttp(server, { story_slug: 'zork' });

    // First connection establishes the participant.
    const c1 = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    let firstId: string;
    try {
      c1.send({ kind: 'hello', handle: host.handle, passcode: host.passcode });
      const w1 = await c1.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome',
      );
      firstId = w1.participant_id;
    } finally {
      c1.close();
    }

    // Wait for the close to propagate and presence to update.
    await new Promise((r) => setTimeout(r, 30));

    // Second connection with same credentials resolves to the same participant.
    const c2 = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    try {
      c2.send({ kind: 'hello', handle: host.handle, passcode: host.passcode });
      const w2 = await c2.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome',
      );
      expect(w2.participant_id).toBe(firstId);
    } finally {
      c2.close();
    }
  });

  it('unknown handle → unknown_handle error + close (4001)', async () => {
    // AC-5: unknown_handle vs bad_passcode are distinct close codes.
    const host = await createRoomViaHttp(server, { story_slug: 'zork' });
    const client = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    try {
      client.send({ kind: 'hello', handle: 'nosuchuser', passcode: 'whatever' });
      const err = await client.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'error' }> => m.kind === 'error',
      );
      expect(err.code).toBe('unknown_handle');
      const close = await client.waitForClose();
      expect(close.code).toBe(4001);
    } finally {
      client.close();
    }
  });

  it('wrong passcode for known handle → bad_passcode error + close (4006) (AC-5)', async () => {
    const host = await createRoomViaHttp(server, { story_slug: 'zork' });
    const client = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    try {
      client.send({ kind: 'hello', handle: host.handle, passcode: 'definitely-wrong' });
      const err = await client.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'error' }> => m.kind === 'error',
      );
      expect(err.code).toBe('bad_passcode');
      const close = await client.waitForClose();
      expect(close.code).toBe(4006);
    } finally {
      client.close();
    }
  });

  it('hello frame missing handle → hello_required close (4000)', async () => {
    const host = await createRoomViaHttp(server, { story_slug: 'zork' });
    const client = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    try {
      client.ws.send(JSON.stringify({ kind: 'hello', passcode: 'p' }));
      const err = await client.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'error' }> => m.kind === 'error',
      );
      expect(err.code).toBe('hello_required');
      const close = await client.waitForClose();
      expect(close.code).toBe(4000);
    } finally {
      client.close();
    }
  });

  it('hello frame missing passcode → hello_required close (4000)', async () => {
    const host = await createRoomViaHttp(server, { story_slug: 'zork' });
    const client = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    try {
      client.ws.send(JSON.stringify({ kind: 'hello', handle: 'someone' }));
      const err = await client.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'error' }> => m.kind === 'error',
      );
      expect(err.code).toBe('hello_required');
      const close = await client.waitForClose();
      expect(close.code).toBe(4000);
    } finally {
      client.close();
    }
  });

  it('erased identity → unknown_handle (hard delete makes it unreachable; AC-7)', async () => {
    const host = await createRoomViaHttp(server, { story_slug: 'zork' });
    const stranger = ensureTestIdentity(server, 'Doomed');
    server.identities.delete(stranger.id);

    const client = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    try {
      client.send({ kind: 'hello', handle: stranger.handle, passcode: stranger.passcode });
      const err = await client.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'error' }> => m.kind === 'error',
      );
      expect(err.code).toBe('unknown_handle');
      const close = await client.waitForClose();
      expect(close.code).toBe(4001);
    } finally {
      client.close();
    }
  });
});
