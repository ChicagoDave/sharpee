/**
 * POST /api/rooms/:room_id/join behavior tests.
 *
 * Behavior Statement — joinRoomRoute
 *   DOES: on new-token path, inserts a participant (tier=participant),
 *         appends a join(reconnect=false) event, and updates rooms.last_activity_at.
 *         On reconnect-token path, flips connected=1 on the existing
 *         participant and appends join(reconnect=true). In both cases,
 *         mutations run in one transaction.
 *   WHEN: a POST references an existing room, a valid display_name, and
 *         an accepted CAPTCHA.
 *   BECAUSE: participants must be persisted to route WebSocket presence
 *            and to enforce role/mute state across disconnects.
 *   REJECTS WHEN: unknown room_id → 404; token from a different room → 401.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, type TestAppHandle } from '../helpers/test-app.js';

async function createRoom(app: TestAppHandle, slug = 'zork') {
  const res = await app.fetch('/api/rooms', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      story_slug: slug,
      title: 'Test Room',
      display_name: 'Host',
      captcha_token: 'stub',
    }),
  });
  return (await res.json()) as {
    room_id: string;
    token: string;
    participant_id: string;
    join_code: string;
  };
}

describe('POST /api/rooms/:room_id/join', () => {
  let app: TestAppHandle;

  beforeEach(() => {
    app = buildTestApp({ stories: ['zork'] });
  });
  afterEach(() => {
    app.cleanup();
  });

  it('happy path: new participant → 200 with participant_id and token', async () => {
    const host = await createRoom(app);
    const res = await app.fetch(`/api/rooms/${host.room_id}/join`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ display_name: 'Bob', captcha_token: 'stub' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { participant_id: string; token: string; tier: string };
    expect(body.participant_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.token).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.tier).toBe('participant');
    expect(body.participant_id).not.toBe(host.participant_id);

    // State: 2 participants on this room.
    const n = (app.db
      .prepare('SELECT COUNT(*) AS n FROM participants WHERE room_id = ?')
      .get(host.room_id) as { n: number }).n;
    expect(n).toBe(2);
  });

  it('unknown room_id → 404 room_not_found', async () => {
    const res = await app.fetch('/api/rooms/nope/join', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ display_name: 'Bob', captcha_token: 'stub' }),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('room_not_found');
  });

  it('reconnect with valid token returns the same participant_id and flips connected', async () => {
    const host = await createRoom(app);
    const joinRes = await app.fetch(`/api/rooms/${host.room_id}/join`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ display_name: 'Bob', captcha_token: 'stub' }),
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
      body: JSON.stringify({ display_name: 'Bob', captcha_token: 'stub' }),
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

    const res = await app.fetch(`/api/rooms/${roomB.room_id}/join`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${roomA.token}`,
      },
      body: JSON.stringify({ display_name: 'Host', captcha_token: 'stub' }),
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('token_wrong_room');
  });

  it('join updates the room last_activity_at', async () => {
    const host = await createRoom(app);
    const before = (app.db
      .prepare('SELECT last_activity_at FROM rooms WHERE room_id = ?')
      .get(host.room_id) as { last_activity_at: string }).last_activity_at;
    await new Promise((r) => setTimeout(r, 10));

    await app.fetch(`/api/rooms/${host.room_id}/join`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ display_name: 'Bob', captcha_token: 'stub' }),
    });

    const after = (app.db
      .prepare('SELECT last_activity_at FROM rooms WHERE room_id = ?')
      .get(host.room_id) as { last_activity_at: string }).last_activity_at;
    expect(after > before).toBe(true);
  });
});
