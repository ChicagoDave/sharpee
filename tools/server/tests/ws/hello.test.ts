/**
 * WebSocket `hello` handshake behavior tests.
 *
 * Behavior Statement — handleHello
 *   DOES: on valid token + matching room, flips participants.connected=1,
 *         appends a `join(reconnect=true)` event, registers the socket in
 *         the connection manager, sends `welcome` with a RoomSnapshot and
 *         participant summaries, broadcasts `presence(connected=true)` to
 *         other room sockets.
 *   WHEN: the first frame on a newly-opened /ws/:room_id socket is hello.
 *   BECAUSE: token-based reconnect (ADR-153 Decision 4) requires a hand-
 *            shake that re-syncs the client's view from DB truth.
 *   REJECTS WHEN:
 *     - missing/unknown token                → error(token_invalid) + close
 *     - token belongs to a different room    → error(token_room_mismatch) + close
 *     - room no longer exists (recycled)     → room_closed + close (N-4)
 *     - first frame is not hello             → error(hello_required) + close
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

describe('WebSocket /ws/:room_id — hello handshake', () => {
  let server: TestServerHandle;

  beforeEach(async () => {
    server = await buildTestServer({ stories: ['zork'] });
  });
  afterEach(async () => {
    await server.close();
  });

  it('valid token → welcome with participant_id and RoomSnapshot; participants.connected=1', async () => {
    const host = await createRoomViaHttp(server, { story_slug: 'zork', display_name: 'Alice' });

    // After HTTP create, connected is currently 1 (the createWithId default).
    // Simulate a fresh-connection flow by flipping it off first.
    server.db
      .prepare('UPDATE participants SET connected = 0 WHERE participant_id = ?')
      .run(host.participant_id);

    const client = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    try {
      client.send({ kind: 'hello', token: host.token });
      const welcome = await client.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome'
      );
      expect(welcome.participant_id).toBe(host.participant_id);
      expect(welcome.room.room_id).toBe(host.room_id);
      expect(welcome.room.story_slug).toBe('zork');
      expect(welcome.room.lock_holder_id).toBeNull();
      expect(welcome.room.saves).toEqual([]);
      expect(welcome.participants.length).toBe(1);
      expect(welcome.participants[0]?.participant_id).toBe(host.participant_id);
      // ADR-153 Decision 8: welcome must carry the recording-transparency
      // notice on every handshake. Exact wording is a wire contract.
      expect(welcome.recording_notice).toMatch(/recorded/i);
      expect(welcome.recording_notice).toMatch(/Direct Messages/);

      const connected = (server.db
        .prepare('SELECT connected FROM participants WHERE participant_id = ?')
        .get(host.participant_id) as { connected: number }).connected;
      expect(connected).toBe(1);
    } finally {
      client.close();
    }
  });

  it('invalid/unknown token → error(token_invalid) + close', async () => {
    const host = await createRoomViaHttp(server, { story_slug: 'zork', display_name: 'Alice' });
    const client = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    try {
      client.send({ kind: 'hello', token: 'not-a-real-token' });
      const err = await client.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'error' }> => m.kind === 'error'
      );
      expect(err.code).toBe('token_invalid');
      const close = await client.waitForClose();
      expect(close.code).toBe(4001);
    } finally {
      client.close();
    }
  });

  it('token from a different room → error(token_room_mismatch) + close', async () => {
    const roomA = await createRoomViaHttp(server, { story_slug: 'zork', display_name: 'A' });
    const roomB = await createRoomViaHttp(server, { story_slug: 'zork', display_name: 'B' });

    const client = await openWsClient(`${server.wsUrl}/ws/${roomB.room_id}`);
    try {
      client.send({ kind: 'hello', token: roomA.token });
      const err = await client.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'error' }> => m.kind === 'error'
      );
      expect(err.code).toBe('token_room_mismatch');
      const close = await client.waitForClose();
      expect(close.code).toBe(4002);
    } finally {
      client.close();
    }
  });

  it('deleted room → room_closed + close (N-4)', async () => {
    const host = await createRoomViaHttp(server, { story_slug: 'zork', display_name: 'Alice' });

    // Simulate an idle recycle mid-session: cascade delete before the client says hello.
    // The participants row is deleted by the cascade, so findByToken will miss —
    // which surfaces as token_invalid rather than room_closed. To exercise the
    // room_closed branch we keep the participant row but NULL out the room.
    //   → easiest path: delete only from rooms, leaving the participant dangling,
    //     then turn off FK checks for the setup.
    server.db.pragma('foreign_keys = OFF');
    server.db.prepare('DELETE FROM rooms WHERE room_id = ?').run(host.room_id);
    server.db.pragma('foreign_keys = ON');

    const client = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    try {
      client.send({ kind: 'hello', token: host.token });
      const closed = await client.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'room_closed' }> => m.kind === 'room_closed'
      );
      expect(closed.reason).toBe('recycled');
      const close = await client.waitForClose();
      expect(close.code).toBe(4004);
    } finally {
      client.close();
    }
  });

  it('non-hello first frame → error(hello_required) + close', async () => {
    const host = await createRoomViaHttp(server, { story_slug: 'zork', display_name: 'Alice' });
    const client = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    try {
      // Cast because the type system rightly rejects a hello-shaped frame with wrong kind
      client.send({ kind: 'chat', text: 'premature' });
      const err = await client.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'error' }> => m.kind === 'error'
      );
      expect(err.code).toBe('hello_required');
      const close = await client.waitForClose();
      expect(close.code).toBe(4000);
    } finally {
      client.close();
    }
  });

  /* ---------- Phase 7: first-join auto-nomination ---------- */

  it('second participant hello: auto-nominates them, is_successor=1, successor broadcast, role(nominate) logged (actor=null)', async () => {
    const host = await createRoomViaHttp(server, {
      story_slug: 'zork',
      display_name: 'Alice',
    });
    const guest = await joinRoomViaHttp(server, host.room_id, 'Bob');

    const hostClient = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    const guestClient = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    try {
      hostClient.send({ kind: 'hello', token: host.token });
      await hostClient.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome'
      );

      guestClient.send({ kind: 'hello', token: guest.token });
      await guestClient.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome'
      );

      const successor = await hostClient.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'successor' }> => m.kind === 'successor'
      );
      expect(successor.participant_id).toBe(guest.participant_id);

      // is_successor persisted in DB
      const guestRow = server.db
        .prepare('SELECT is_successor FROM participants WHERE participant_id = ?')
        .get(guest.participant_id) as { is_successor: number };
      expect(guestRow.is_successor).toBe(1);

      // role(nominate) event with actor=null (system)
      const ev = server.db
        .prepare(
          `SELECT participant_id, payload FROM session_events
           WHERE room_id = ? AND kind = 'role' ORDER BY event_id DESC LIMIT 1`
        )
        .get(host.room_id) as { participant_id: string | null; payload: string };
      expect(ev.participant_id).toBeNull();
      expect(JSON.parse(ev.payload)).toEqual({
        kind: 'role',
        op: 'nominate',
        target_participant_id: guest.participant_id,
      });
    } finally {
      hostClient.close();
      guestClient.close();
    }
  });

  it('third participant hello with a successor already in place: NO auto-nomination', async () => {
    const host = await createRoomViaHttp(server, {
      story_slug: 'zork',
      display_name: 'Alice',
    });
    const guest = await joinRoomViaHttp(server, host.room_id, 'Bob');
    const guest2 = await joinRoomViaHttp(server, host.room_id, 'Carol');

    const hostClient = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    const guestClient = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    const guest2Client = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    try {
      hostClient.send({ kind: 'hello', token: host.token });
      await hostClient.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome'
      );

      guestClient.send({ kind: 'hello', token: guest.token });
      await guestClient.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome'
      );
      // First successor broadcast — guest was auto-nominated.
      await hostClient.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'successor' }> => m.kind === 'successor'
      );

      guest2Client.send({ kind: 'hello', token: guest2.token });
      await guest2Client.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome'
      );

      // Give the server a tick to emit anything else
      await new Promise((r) => setTimeout(r, 50));

      // No SECOND successor broadcast — successor is still `guest`
      const successorBroadcasts = hostClient.received.filter(
        (m) => m.kind === 'successor'
      );
      expect(successorBroadcasts.length).toBe(1);
      expect((successorBroadcasts[0] as Extract<ServerMsg, { kind: 'successor' }>).participant_id).toBe(
        guest.participant_id
      );

      // DB: only guest has is_successor=1
      const guest2Row = server.db
        .prepare('SELECT is_successor FROM participants WHERE participant_id = ?')
        .get(guest2.participant_id) as { is_successor: number };
      expect(guest2Row.is_successor).toBe(0);
    } finally {
      hostClient.close();
      guestClient.close();
      guest2Client.close();
    }
  });

  it('PH hello in an empty room: no auto-nomination', async () => {
    const host = await createRoomViaHttp(server, {
      story_slug: 'zork',
      display_name: 'Alice',
    });

    const hostClient = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    try {
      hostClient.send({ kind: 'hello', token: host.token });
      await hostClient.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome'
      );
      await new Promise((r) => setTimeout(r, 30));

      expect(hostClient.received.some((m) => m.kind === 'successor')).toBe(false);

      // PH is not marked as their own successor
      const hostRow = server.db
        .prepare('SELECT is_successor FROM participants WHERE participant_id = ?')
        .get(host.participant_id) as { is_successor: number };
      expect(hostRow.is_successor).toBe(0);
    } finally {
      hostClient.close();
    }
  });
});
