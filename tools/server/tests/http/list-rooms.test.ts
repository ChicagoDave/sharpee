/**
 * GET /api/rooms behavior tests.
 *
 * Behavior Statement — listRoomsRoute
 *   DOES: returns rooms[] where each entry is a non-secret summary
 *         (room_id, title, story_slug, participant_count, last_activity_at)
 *         for rooms that have at least one row in participants with
 *         connected=1. Always returns 200; empty list when no rooms qualify.
 *   WHEN: any unauthenticated GET /api/rooms.
 *   BECAUSE: the landing page needs a live-activity discovery signal
 *            without leaking join_code, tokens, or participant identity.
 *   REJECTS WHEN: never — this is a read endpoint with no bad state.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { buildTestApp, type TestAppHandle } from '../helpers/test-app.js';

function createRoom(
  app: TestAppHandle,
  overrides: { story_slug?: string; title?: string; display_name?: string } = {},
): Promise<{
  room_id: string;
  join_code: string;
  token: string;
  participant_id: string;
}> {
  return app
    .fetch('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        story_slug: overrides.story_slug ?? 'zork',
        title: overrides.title ?? 'Test Room',
        display_name: overrides.display_name ?? 'Alice',
        captcha_token: 'stub',
      }),
    })
    .then((res) => res.json() as Promise<{
      room_id: string;
      join_code: string;
      token: string;
      participant_id: string;
    }>);
}

function setConnected(app: TestAppHandle, participant_id: string, connected: boolean): void {
  app.db
    .prepare('UPDATE participants SET connected = ? WHERE participant_id = ?')
    .run(connected ? 1 : 0, participant_id);
}

describe('GET /api/rooms', () => {
  let app: TestAppHandle;

  afterEach(() => {
    app?.cleanup();
  });

  it('returns an empty array when no rooms exist', async () => {
    app = buildTestApp({ stories: ['zork'] });
    const res = await app.fetch('/api/rooms');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { rooms: unknown[] };
    expect(body.rooms).toEqual([]);
  });

  it('includes rooms that have at least one connected participant', async () => {
    app = buildTestApp({ stories: ['zork'] });
    const created = await createRoom(app, { title: 'Live One' });

    const res = await app.fetch('/api/rooms');
    const body = (await res.json()) as {
      rooms: Array<{ room_id: string; title: string }>;
    };
    expect(body.rooms).toHaveLength(1);
    expect(body.rooms[0]?.room_id).toBe(created.room_id);
    expect(body.rooms[0]?.title).toBe('Live One');
  });

  it('excludes rooms where all participants are disconnected', async () => {
    app = buildTestApp({ stories: ['zork'] });
    const ghost = await createRoom(app, { title: 'Ghost Town' });
    setConnected(app, ghost.participant_id, false);

    const res = await app.fetch('/api/rooms');
    const body = (await res.json()) as { rooms: Array<{ room_id: string }> };
    expect(body.rooms).toHaveLength(0);
  });

  it('response never contains join_code or tokens', async () => {
    app = buildTestApp({ stories: ['zork'] });
    await createRoom(app);

    const res = await app.fetch('/api/rooms');
    const raw = await res.text();
    expect(raw).not.toContain('join_code');
    expect(raw).not.toContain('token');
    expect(raw).not.toContain('primary_host_id');
  });

  it('participant_count reflects only connected participants', async () => {
    app = buildTestApp({ stories: ['zork'] });
    const created = await createRoom(app);

    // PH is connected by default (count == 1). Insert two more participants:
    // one connected, one disconnected.
    const now = new Date().toISOString();
    app.db
      .prepare(
        `INSERT INTO participants (participant_id, room_id, token, display_name, tier,
                                   muted, connected, is_successor, joined_at)
         VALUES (?, ?, ?, ?, 'participant', 0, 1, 0, ?)`,
      )
      .run('conn-2', created.room_id, 'tok-2', 'Bob', now);
    app.db
      .prepare(
        `INSERT INTO participants (participant_id, room_id, token, display_name, tier,
                                   muted, connected, is_successor, joined_at)
         VALUES (?, ?, ?, ?, 'participant', 0, 0, 0, ?)`,
      )
      .run('disc-3', created.room_id, 'tok-3', 'Carol', now);

    const res = await app.fetch('/api/rooms');
    const body = (await res.json()) as {
      rooms: Array<{ room_id: string; participant_count: number }>;
    };
    expect(body.rooms).toHaveLength(1);
    expect(body.rooms[0]?.participant_count).toBe(2);
  });

  it('returns rooms ordered by last_activity_at DESC', async () => {
    app = buildTestApp({ stories: ['zork', 'cloak'] });
    const first = await createRoom(app, { story_slug: 'zork', title: 'Older' });
    const second = await createRoom(app, { story_slug: 'cloak', title: 'Newer' });

    // Force first to have an older last_activity_at.
    app.db
      .prepare('UPDATE rooms SET last_activity_at = ? WHERE room_id = ?')
      .run('2000-01-01T00:00:00.000Z', first.room_id);

    const res = await app.fetch('/api/rooms');
    const body = (await res.json()) as { rooms: Array<{ room_id: string; title: string }> };
    expect(body.rooms.map((r) => r.room_id)).toEqual([second.room_id, first.room_id]);
  });
});
