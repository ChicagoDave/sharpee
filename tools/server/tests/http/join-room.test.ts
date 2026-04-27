/**
 * POST /api/rooms/:room_id/join behavior tests.
 *
 * Behavior Statement — joinRoomRoute (ADR-161 Phase B)
 *   DOES: on new-token path, inserts a participant (tier=participant) whose
 *         `identity_id` references the server-internal `id` resolved from
 *         `(handle, passcode)`, appends a join(reconnect=false) event whose
 *         `handle` payload is sourced from `identity.handle`, and
 *         updates rooms.last_activity_at. On reconnect-token path, flips
 *         connected=1 on the existing participant and appends
 *         join(reconnect=true). In both cases, mutations run in one
 *         transaction.
 *   WHEN: a POST references an existing room and carries
 *         `(handle, passcode)` plus an accepted CAPTCHA.
 *   BECAUSE: participants must be persisted to route WebSocket presence
 *            and to enforce role/mute state across disconnects. ADR-161
 *            closes the auth gap: every identity-bearing route resolves
 *            the caller via credentials, not a bare `id`.
 *   REJECTS WHEN: unknown room_id → 404 room_not_found; body missing →
 *                 400 bad_request; missing handle or passcode → 400
 *                 missing_field; CAPTCHA fails → 400 captcha_failed;
 *                 unknown handle → 404 unknown_handle; passcode mismatch
 *                 → 401 bad_passcode; token from a different room → 401
 *                 token_wrong_room.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, type TestAppHandle } from '../helpers/test-app.js';

async function createRoom(app: TestAppHandle, slug = 'zork') {
  const identity = app.seedIdentity();
  const res = await app.fetch('/api/rooms', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      story_slug: slug,
      title: 'Test Room',
      handle: identity.handle,
      passcode: identity.passcode,
      captcha_token: 'stub',
    }),
  });
  const body = (await res.json()) as {
    room_id: string;
    token: string;
    participant_id: string;
    join_code: string;
  };
  return { ...body, host_identity: identity };
}

describe('POST /api/rooms/:room_id/join', () => {
  let app: TestAppHandle;

  beforeEach(() => {
    app = buildTestApp({ stories: ['zork'] });
  });
  afterEach(() => {
    app.cleanup();
  });

  it('happy path: new participant → 200 with participant_id and token; bound to resolved id', async () => {
    const host = await createRoom(app);
    const guest = app.seedIdentity();
    const res = await app.fetch(`/api/rooms/${host.room_id}/join`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        handle: guest.handle,
        passcode: guest.passcode,
        captcha_token: 'stub',
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { participant_id: string; token: string; tier: string };
    expect(body.participant_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.token).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.tier).toBe('participant');
    expect(body.participant_id).not.toBe(host.participant_id);

    // Participant row's identity_id references the server-internal id.
    const row = app.db
      .prepare('SELECT identity_id FROM participants WHERE participant_id = ?')
      .get(body.participant_id) as { identity_id: string } | undefined;
    expect(row?.identity_id).toBe(guest.id);

    // Two participants now on this room.
    const n = (app.db
      .prepare('SELECT COUNT(*) AS n FROM participants WHERE room_id = ?')
      .get(host.room_id) as { n: number }).n;
    expect(n).toBe(2);

    // The join event's handle is the resolved identity.handle.
    const events = app.db
      .prepare(
        "SELECT payload FROM session_events WHERE room_id = ? AND kind = 'join' AND participant_id = ?",
      )
      .all(host.room_id, body.participant_id) as { payload: string }[];
    expect(events).toHaveLength(1);
    const parsed = JSON.parse(events[0]!.payload) as { handle: string };
    expect(parsed.handle).toBe(guest.handle);
  });

  it('happy path with REAL argon2: full credential round-trip (Integration Reality)', async () => {
    // Real-path test for the ADR-161 auth-uniformity contract on join-room:
    // POST /api/identities → POST /api/rooms (host) → POST /api/identities
    // → POST /api/rooms/:id/join (guest), all via the production HashService.
    app.cleanup();
    app = buildTestApp({ stories: ['zork'], realHashService: true });

    const hostIdRes = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'realhost' }),
    });
    expect(hostIdRes.status).toBe(201);
    const hostIdentity = (await hostIdRes.json()) as {
      id: string;
      handle: string;
      passcode: string;
    };
    const hostRoomRes = await app.fetch('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        story_slug: 'zork',
        title: 'Real Argon2 Join',
        handle: hostIdentity.handle,
        passcode: hostIdentity.passcode,
        captcha_token: 'stub',
      }),
    });
    expect(hostRoomRes.status).toBe(201);
    const host = (await hostRoomRes.json()) as { room_id: string };

    const guestIdRes = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'realguest' }),
    });
    expect(guestIdRes.status).toBe(201);
    const guestIdentity = (await guestIdRes.json()) as {
      id: string;
      handle: string;
      passcode: string;
    };

    const joinRes = await app.fetch(`/api/rooms/${host.room_id}/join`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        handle: guestIdentity.handle,
        passcode: guestIdentity.passcode,
        captcha_token: 'stub',
      }),
    });
    expect(joinRes.status).toBe(200);
    const guest = (await joinRes.json()) as { participant_id: string };
    const row = app.db
      .prepare('SELECT identity_id FROM participants WHERE participant_id = ?')
      .get(guest.participant_id) as { identity_id: string } | undefined;
    expect(row?.identity_id).toBe(guestIdentity.id);
  }, 60_000);

  it('unknown room_id → 404 room_not_found', async () => {
    const guest = app.seedIdentity();
    const res = await app.fetch('/api/rooms/nope/join', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        handle: guest.handle,
        passcode: guest.passcode,
        captcha_token: 'stub',
      }),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('room_not_found');
  });

  it('missing handle → 400 missing_field, no participant written', async () => {
    const host = await createRoom(app);
    const before = (app.db
      .prepare('SELECT COUNT(*) AS n FROM participants WHERE room_id = ?')
      .get(host.room_id) as { n: number }).n;
    const res = await app.fetch(`/api/rooms/${host.room_id}/join`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ passcode: 'pc-irrelevant', captcha_token: 'stub' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('missing_field');
    const after = (app.db
      .prepare('SELECT COUNT(*) AS n FROM participants WHERE room_id = ?')
      .get(host.room_id) as { n: number }).n;
    expect(after).toBe(before);
  });

  it('missing passcode → 400 missing_field', async () => {
    const host = await createRoom(app);
    const res = await app.fetch(`/api/rooms/${host.room_id}/join`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'alice', captcha_token: 'stub' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('missing_field');
  });

  it('unknown handle → 404 unknown_handle, no participant written (AC-5)', async () => {
    const host = await createRoom(app);
    const before = (app.db
      .prepare('SELECT COUNT(*) AS n FROM participants WHERE room_id = ?')
      .get(host.room_id) as { n: number }).n;
    const res = await app.fetch(`/api/rooms/${host.room_id}/join`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        handle: 'nobody',
        passcode: 'pc-irrelevant',
        captcha_token: 'stub',
      }),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('unknown_handle');
    const after = (app.db
      .prepare('SELECT COUNT(*) AS n FROM participants WHERE room_id = ?')
      .get(host.room_id) as { n: number }).n;
    expect(after).toBe(before);
  });

  it('wrong passcode → 401 bad_passcode, no participant written (AC-5)', async () => {
    const host = await createRoom(app);
    const guest = app.seedIdentity();
    const before = (app.db
      .prepare('SELECT COUNT(*) AS n FROM participants WHERE room_id = ?')
      .get(host.room_id) as { n: number }).n;
    const res = await app.fetch(`/api/rooms/${host.room_id}/join`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        handle: guest.handle,
        passcode: `${guest.passcode}-wrong`,
        captcha_token: 'stub',
      }),
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('bad_passcode');
    const after = (app.db
      .prepare('SELECT COUNT(*) AS n FROM participants WHERE room_id = ?')
      .get(host.room_id) as { n: number }).n;
    expect(after).toBe(before);
  });

  it('reconnect with valid token returns the same participant_id and flips connected', async () => {
    const host = await createRoom(app);
    const guest = app.seedIdentity();
    const joinRes = await app.fetch(`/api/rooms/${host.room_id}/join`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        handle: guest.handle,
        passcode: guest.passcode,
        captcha_token: 'stub',
      }),
    });
    const first = (await joinRes.json()) as { participant_id: string; token: string };

    // Simulate Bob disconnecting.
    app.db
      .prepare('UPDATE participants SET connected = 0 WHERE participant_id = ?')
      .run(first.participant_id);

    const reconnectRes = await app.fetch(`/api/rooms/${host.room_id}/join`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${first.token}`,
      },
      body: JSON.stringify({
        handle: guest.handle,
        passcode: guest.passcode,
        captcha_token: 'stub',
      }),
    });
    expect(reconnectRes.status).toBe(200);
    const second = (await reconnectRes.json()) as { participant_id: string; token: string };
    expect(second.participant_id).toBe(first.participant_id);
    expect(second.token).toBe(first.token);

    const connected = (app.db
      .prepare('SELECT connected FROM participants WHERE participant_id = ?')
      .get(first.participant_id) as { connected: number }).connected;
    expect(connected).toBe(1);
  });

  it('token from a different room → 401 token_wrong_room', async () => {
    const roomA = await createRoom(app);
    const roomB = await createRoom(app);
    const guest = app.seedIdentity();

    const res = await app.fetch(`/api/rooms/${roomB.room_id}/join`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${roomA.token}`,
      },
      body: JSON.stringify({
        handle: guest.handle,
        passcode: guest.passcode,
        captcha_token: 'stub',
      }),
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('token_wrong_room');
  });

  it('join updates the room last_activity_at', async () => {
    const host = await createRoom(app);
    const guest = app.seedIdentity();
    const before = (app.db
      .prepare('SELECT last_activity_at FROM rooms WHERE room_id = ?')
      .get(host.room_id) as { last_activity_at: string }).last_activity_at;
    await new Promise((r) => setTimeout(r, 10));

    await app.fetch(`/api/rooms/${host.room_id}/join`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        handle: guest.handle,
        passcode: guest.passcode,
        captcha_token: 'stub',
      }),
    });

    const after = (app.db
      .prepare('SELECT last_activity_at FROM rooms WHERE room_id = ?')
      .get(host.room_id) as { last_activity_at: string }).last_activity_at;
    expect(after > before).toBe(true);
  });
});
