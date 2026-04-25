/**
 * WebSocket `hello` handshake behavior tests.
 *
 * Behavior Statement — handleHello
 *   DOES: on valid (username, secret), looks up identity, verifies hash,
 *         resolves or creates the participant for (identity_id, room_id),
 *         flips participants.connected=1, appends a `join` event, registers
 *         the socket in the connection manager, sends `welcome` with a
 *         RoomSnapshot and participant summaries, broadcasts
 *         `presence(connected=true)` to other room sockets.
 *   WHEN: the first frame on a newly-opened /ws/:room_id socket is hello.
 *   BECAUSE: ADR-159 cutover — the persistent identity is the WS hello
 *            credential; the per-room token survives only as an HTTP-side
 *            session marker.
 *   REJECTS WHEN:
 *     - first frame is not hello             → error(hello_required) + close
 *     - room no longer exists (recycled)     → room_closed + close (N-4)
 *     - identity-specific paths (unknown_identity / bad_credentials) live
 *       in tests/ws/hello-identity.test.ts.
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
      client.send({ kind: 'hello', username: host.username, secret: host.secret });
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
      // Fresh room has no chat history yet.
      expect(welcome.chat_backlog).toEqual([]);
      // No DMs yet either — Plan 04 Phase 4 wire contract.
      expect(welcome.dm_threads).toEqual({});
    } finally {
      client.close();
    }
  });

  it('welcome.chat_backlog carries prior chat events in chronological order, capped by the server', async () => {
    const host = await createRoomViaHttp(server, { story_slug: 'zork', display_name: 'Alice' });
    // Seed 60 chat events directly; the welcome cap is 50 so the oldest 10
    // should drop off and the remaining 50 should arrive in ASC event_id.
    const insert = server.db.prepare(
      `INSERT INTO session_events (room_id, participant_id, ts, kind, payload)
       VALUES (?, ?, ?, 'chat', ?)`,
    );
    for (let i = 1; i <= 60; i += 1) {
      const ts = new Date(Date.UTC(2026, 3, 22, 17, 0, i)).toISOString();
      insert.run(
        host.room_id,
        host.participant_id,
        ts,
        JSON.stringify({ kind: 'chat', text: `msg ${i}` }),
      );
    }
    server.db
      .prepare('UPDATE participants SET connected = 0 WHERE participant_id = ?')
      .run(host.participant_id);

    const client = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    try {
      client.send({ kind: 'hello', username: host.username, secret: host.secret });
      const welcome = await client.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome',
      );
      expect(welcome.chat_backlog).toHaveLength(50);
      expect(welcome.chat_backlog[0]!.text).toBe('msg 11');
      expect(welcome.chat_backlog.at(-1)!.text).toBe('msg 60');
      // Every entry carries the sender id and a server-generated event_id.
      for (const entry of welcome.chat_backlog) {
        expect(entry.from).toBe(host.participant_id);
        expect(typeof entry.event_id).toBe('number');
        expect(typeof entry.ts).toBe('string');
      }
    } finally {
      client.close();
    }
  });

  // ---------- Plan 04 Phase 4 — DM thread rehydration on welcome ----------

  it('welcome.dm_threads carries prior DMs grouped by peer for a Primary Host viewer', async () => {
    const host = await createRoomViaHttp(server, { story_slug: 'zork', display_name: 'Alice' });
    const ch = await joinRoomViaHttp(server, host.room_id, 'Bob');
    server.db.prepare(`UPDATE participants SET tier = 'co_host' WHERE participant_id = ?`).run(ch.participant_id);

    // Seed two DMs in each direction PH↔CH.
    const insert = server.db.prepare(
      `INSERT INTO session_events (room_id, participant_id, ts, kind, payload)
       VALUES (?, ?, ?, 'dm', ?)`,
    );
    insert.run(host.room_id, host.participant_id, '2026-04-23T17:00:00Z',
      JSON.stringify({ kind: 'dm', to_participant_id: ch.participant_id, text: 'a' }));
    insert.run(host.room_id, ch.participant_id, '2026-04-23T17:00:01Z',
      JSON.stringify({ kind: 'dm', to_participant_id: host.participant_id, text: 'b' }));
    insert.run(host.room_id, host.participant_id, '2026-04-23T17:00:02Z',
      JSON.stringify({ kind: 'dm', to_participant_id: ch.participant_id, text: 'c' }));

    server.db.prepare('UPDATE participants SET connected = 0 WHERE participant_id = ?').run(host.participant_id);
    const client = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    try {
      client.send({ kind: 'hello', username: host.username, secret: host.secret });
      const welcome = await client.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome',
      );
      // PH sees one thread, keyed by the Co-Host's id.
      expect(Object.keys(welcome.dm_threads)).toEqual([ch.participant_id]);
      const thread = welcome.dm_threads[ch.participant_id]!;
      expect(thread).toHaveLength(3);
      expect(thread.map((e) => e.text)).toEqual(['a', 'b', 'c']);
      // Every entry preserves from/to so the client can render direction.
      expect(thread[0]!.from).toBe(host.participant_id);
      expect(thread[0]!.to).toBe(ch.participant_id);
      expect(thread[1]!.from).toBe(ch.participant_id);
      expect(thread[1]!.to).toBe(host.participant_id);
    } finally {
      client.close();
    }
  });

  it('Co-Host viewer sees the same thread keyed by the PH id', async () => {
    const host = await createRoomViaHttp(server, { story_slug: 'zork', display_name: 'Alice' });
    const ch = await joinRoomViaHttp(server, host.room_id, 'Bob');
    server.db.prepare(`UPDATE participants SET tier = 'co_host' WHERE participant_id = ?`).run(ch.participant_id);

    const insert = server.db.prepare(
      `INSERT INTO session_events (room_id, participant_id, ts, kind, payload)
       VALUES (?, ?, ?, 'dm', ?)`,
    );
    insert.run(host.room_id, host.participant_id, '2026-04-23T17:00:00Z',
      JSON.stringify({ kind: 'dm', to_participant_id: ch.participant_id, text: 'hi' }));

    server.db.prepare('UPDATE participants SET connected = 0 WHERE participant_id = ?').run(ch.participant_id);
    const client = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    try {
      client.send({ kind: 'hello', username: ch.username, secret: ch.secret });
      const welcome = await client.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome',
      );
      // Co-Host's view: thread keyed by the PH's id, not their own.
      expect(Object.keys(welcome.dm_threads)).toEqual([host.participant_id]);
      expect(welcome.dm_threads[host.participant_id]!).toHaveLength(1);
      expect(welcome.dm_threads[host.participant_id]![0]!.text).toBe('hi');
    } finally {
      client.close();
    }
  });

  it('Participant viewer sees dm_threads = {} even when DM events name them', async () => {
    const host = await createRoomViaHttp(server, { story_slug: 'zork', display_name: 'Alice' });
    const part = await joinRoomViaHttp(server, host.room_id, 'Charlie');
    // Charlie defaults to 'participant' — no tier promotion.

    // Defense-in-depth: simulate an out-of-band DM row that names Charlie.
    // The handler shouldn't ever emit one, but the snapshot filter must
    // still drop it for non-PH/CoHost viewers.
    server.db.prepare(
      `INSERT INTO session_events (room_id, participant_id, ts, kind, payload)
       VALUES (?, ?, ?, 'dm', ?)`,
    ).run(
      host.room_id,
      host.participant_id,
      '2026-04-23T17:00:00Z',
      JSON.stringify({ kind: 'dm', to_participant_id: part.participant_id, text: 'leak?' }),
    );

    server.db.prepare('UPDATE participants SET connected = 0 WHERE participant_id = ?').run(part.participant_id);
    const client = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    try {
      client.send({ kind: 'hello', username: part.username, secret: part.secret });
      const welcome = await client.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome',
      );
      expect(welcome.dm_threads).toEqual({});
    } finally {
      client.close();
    }
  });

  // ADR-159: identity rejection paths (unknown_identity / bad_credentials)
  // live in tests/ws/hello-identity.test.ts. The "token from a different
  // room" scenario is no longer applicable — identity is room-agnostic;
  // first hello to a new room creates a participant there.

  it('deleted room → room_closed + close (N-4)', async () => {
    const host = await createRoomViaHttp(server, { story_slug: 'zork', display_name: 'Alice' });

    // The room check runs before identity verification, so deleting the room
    // alone surfaces room_closed. Cascade is fine — we don't depend on the
    // participant row remaining.
    server.db.prepare('DELETE FROM rooms WHERE room_id = ?').run(host.room_id);

    const client = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    try {
      client.send({ kind: 'hello', username: host.username, secret: host.secret });
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
      hostClient.send({ kind: 'hello', username: host.username, secret: host.secret });
      await hostClient.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome'
      );

      guestClient.send({ kind: 'hello', username: guest.username, secret: guest.secret });
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
      hostClient.send({ kind: 'hello', username: host.username, secret: host.secret });
      await hostClient.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome'
      );

      guestClient.send({ kind: 'hello', username: guest.username, secret: guest.secret });
      await guestClient.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome'
      );
      // First successor broadcast — guest was auto-nominated.
      await hostClient.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'successor' }> => m.kind === 'successor'
      );

      guest2Client.send({ kind: 'hello', username: guest2.username, secret: guest2.secret });
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
      hostClient.send({ kind: 'hello', username: host.username, secret: host.secret });
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
