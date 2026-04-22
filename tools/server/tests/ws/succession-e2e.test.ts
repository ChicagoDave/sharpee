/**
 * End-to-end succession round-trip (AC3).
 *
 * Behavior Statement — full 3-user cascading succession
 *   DOES: with Alice=PH, Bob=co_host+successor, Carol=participant all
 *         connected:
 *     - When Alice closes her socket and the grace window elapses:
 *       · Alice is demoted to `participant` in the DB and loses PH-ness.
 *       · Bob is promoted to `primary_host`, `is_successor=0`.
 *       · Carol (earliest connected non-PH) becomes `co_host` with
 *         `is_successor=1`.
 *       · `rooms.primary_host_id` points at Bob.
 *       · session_events has role events in order:
 *         demote(Alice), promote(Bob→PH), promote(Carol→co_host),
 *         nominate(Carol), all with participant_id=null.
 *       · Bob and Carol (still connected) receive four broadcasts:
 *         role_change(Alice→participant,null actor),
 *         role_change(Bob→primary_host,null), role_change(Carol→co_host,null),
 *         successor(Carol).
 *     - When Alice reconnects: her welcome shows her tier as `participant`.
 *   WHEN: the real HTTP+WS server stack is driven by a mock clock so the
 *         grace-fire is deterministic.
 *   BECAUSE: ADR-153 AC3 — the full cascade is the hardest invariant in
 *            Phase 7 and must hold under real WebSocket + transaction flow.
 *   REJECTS WHEN: the ph-grace-wiring and succession unit tests already
 *                 cover rejection / race cases.
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

describe('succession E2E (AC3): full 3-user cascade', () => {
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
    token: string
  ): Promise<TestWsClient> {
    const c = track(await openWsClient(`${server.wsUrl}/ws/${room_id}`));
    c.send({ kind: 'hello', token });
    await c.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome'
    );
    return c;
  }

  it('PH disconnect + grace fire: Bob (co_host successor) → PH; Carol → co_host + successor; Alice (old PH) tier=participant', async () => {
    // --- setup: 3 users, Alice is PH; Bob promoted to co_host (still successor)
    const alice = await createRoomViaHttp(server, {
      story_slug: 'zork',
      display_name: 'Alice',
    });
    const bob = await joinRoomViaHttp(server, alice.room_id, 'Bob');
    const carol = await joinRoomViaHttp(server, alice.room_id, 'Carol');

    const aliceClient = await openAndHello(alice.room_id, alice.token);
    const bobClient = await openAndHello(alice.room_id, bob.token);
    const carolClient = await openAndHello(alice.room_id, carol.token);

    // Drain the auto-nomination successor broadcast Bob got on his hello.
    await aliceClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'successor' }> =>
        m.kind === 'successor' && m.participant_id === bob.participant_id
    );

    // Alice promotes Bob to co_host (this lets us verify promotions preserve
    // is_successor and that succession correctly demotes co_host → PH).
    aliceClient.send({
      kind: 'promote',
      target_participant_id: bob.participant_id,
      to_tier: 'co_host',
    });
    await aliceClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'role_change' }> =>
        m.kind === 'role_change' &&
        m.participant_id === bob.participant_id &&
        m.tier === 'co_host'
    );

    // PRECONDITIONS in DB
    const preBob = server.db
      .prepare('SELECT tier, is_successor FROM participants WHERE participant_id = ?')
      .get(bob.participant_id) as { tier: string; is_successor: number };
    expect(preBob.tier).toBe('co_host');
    expect(preBob.is_successor).toBe(1);

    // --- Alice disconnects; grace timer scheduled.
    aliceClient.close();
    await new Promise((r) => setTimeout(r, 50));
    expect(server.ws.phGraceTimer.pending()).toEqual([alice.room_id]);

    // --- advance past the 60s grace window; succession fires.
    clock.advance(60_001);

    // --- both remaining clients receive the full broadcast chain.
    // Each predicate pins the expected succession outcome (tier + system
    // actor), which also disambiguates against pre-succession role_changes
    // such as Alice's promote-Bob-to-co_host broadcast.
    const roleChangeAliceOnBob = await bobClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'role_change' }> =>
        m.kind === 'role_change' &&
        m.participant_id === alice.participant_id &&
        m.tier === 'participant' &&
        m.actor_id === null
    );
    expect(roleChangeAliceOnBob.actor_id).toBeNull();

    const roleChangeBobOnBob = await bobClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'role_change' }> =>
        m.kind === 'role_change' &&
        m.participant_id === bob.participant_id &&
        m.tier === 'primary_host' &&
        m.actor_id === null
    );
    expect(roleChangeBobOnBob.actor_id).toBeNull();

    const roleChangeCarolOnBob = await bobClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'role_change' }> =>
        m.kind === 'role_change' &&
        m.participant_id === carol.participant_id &&
        m.tier === 'co_host' &&
        m.actor_id === null
    );
    expect(roleChangeCarolOnBob.actor_id).toBeNull();

    const successorCarolOnBob = await bobClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'successor' }> =>
        m.kind === 'successor' && m.participant_id === carol.participant_id
    );
    expect(successorCarolOnBob.participant_id).toBe(carol.participant_id);

    // Carol's socket saw the same chain.
    const successorCarolOnCarol = await carolClient.waitFor(
      (m): m is Extract<ServerMsg, { kind: 'successor' }> =>
        m.kind === 'successor' && m.participant_id === carol.participant_id
    );
    expect(successorCarolOnCarol.participant_id).toBe(carol.participant_id);

    // --- DB postconditions
    const aliceRow = server.db
      .prepare('SELECT tier, is_successor FROM participants WHERE participant_id = ?')
      .get(alice.participant_id) as { tier: string; is_successor: number };
    expect(aliceRow.tier).toBe('participant');
    expect(aliceRow.is_successor).toBe(0);

    const bobRow = server.db
      .prepare('SELECT tier, is_successor FROM participants WHERE participant_id = ?')
      .get(bob.participant_id) as { tier: string; is_successor: number };
    expect(bobRow.tier).toBe('primary_host');
    expect(bobRow.is_successor).toBe(0);

    const carolRow = server.db
      .prepare('SELECT tier, is_successor FROM participants WHERE participant_id = ?')
      .get(carol.participant_id) as { tier: string; is_successor: number };
    expect(carolRow.tier).toBe('co_host');
    expect(carolRow.is_successor).toBe(1);

    const room = server.db
      .prepare('SELECT primary_host_id FROM rooms WHERE room_id = ?')
      .get(alice.room_id) as { primary_host_id: string };
    expect(room.primary_host_id).toBe(bob.participant_id);

    // --- session_events has the 4 role rows in order, actor=null for all
    const events = server.db
      .prepare(
        `SELECT participant_id, payload FROM session_events
         WHERE room_id = ? AND kind = 'role'
         ORDER BY event_id ASC`
      )
      .all(alice.room_id) as Array<{ participant_id: string | null; payload: string }>;

    // Strip out any role events emitted before the grace fire (auto-nominate
    // for Bob when he joined; promote when Alice elevated him to co_host).
    const successionEvents = events.filter((e) => e.participant_id === null)
      .map((e) => JSON.parse(e.payload) as { op: string; target_participant_id: string; to_tier?: string });

    // The first null-actor event is Bob's auto-nomination; filter those too
    // by comparing to expected succession chain.
    // Bob's auto-nomination also has participant_id=null (system actor), so
    // the event list contains 5 null-actor events:
    //   [nominate(Bob)]  — from first-join
    //   [demote(Alice), promote(Bob), promote(Carol), nominate(Carol)]  — succession
    expect(successionEvents.length).toBe(5);
    expect(successionEvents.slice(-4)).toEqual([
      expect.objectContaining({ op: 'demote', target_participant_id: alice.participant_id }),
      expect.objectContaining({ op: 'promote', target_participant_id: bob.participant_id, to_tier: 'primary_host' }),
      expect.objectContaining({ op: 'promote', target_participant_id: carol.participant_id, to_tier: 'co_host' }),
      expect.objectContaining({ op: 'nominate', target_participant_id: carol.participant_id }),
    ]);

    // --- Alice reconnects; welcome shows tier=participant
    const aliceReconnect = await openAndHello(alice.room_id, alice.token);
    const welcome = aliceReconnect.received.find(
      (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome'
    );
    expect(welcome).toBeDefined();
    const aliceSelf = welcome!.participants.find(
      (p) => p.participant_id === alice.participant_id
    );
    expect(aliceSelf!.tier).toBe('participant');
    // RoomSnapshot doesn't expose primary_host_id directly; verify Bob is the
    // sole primary_host in the welcome participants list.
    const phs = welcome!.participants.filter((p) => p.tier === 'primary_host');
    expect(phs.length).toBe(1);
    expect(phs[0]!.participant_id).toBe(bob.participant_id);
  });
});
