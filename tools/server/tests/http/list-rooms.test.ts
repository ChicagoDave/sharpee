/**
 * GET /api/rooms behavior tests.
 *
 * Behavior Statement — listRoomsRoute
 *   DOES: returns rooms[] where each entry is a non-secret summary
 *         (room_id, title, story_slug, participants[], last_activity_at)
 *         for rooms that have at least one row in participants with
 *         connected=1. `participants` is the connected roster as
 *         `{ handle }` entries sourced from `identities.handle`,
 *         alphabetised. Always returns 200; empty list when no rooms
 *         qualify.
 *   WHEN: any unauthenticated GET /api/rooms.
 *   BECAUSE: the landing page needs a live-activity discovery signal
 *            (with Handles for the roster preview, ADR-161 Phase F)
 *            without leaking join_code, tokens, or participant identity.
 *   REJECTS WHEN: never — this is a read endpoint with no bad state.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { buildTestApp, type TestAppHandle } from '../helpers/test-app.js';

function createRoom(
  app: TestAppHandle,
  overrides: { story_slug?: string; title?: string } = {},
): Promise<{
  room_id: string;
  join_code: string;
  token: string;
  participant_id: string;
}> {
  const identity = app.seedIdentity();
  return app
    .fetch('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        story_slug: overrides.story_slug ?? 'zork',
        title: overrides.title ?? 'Test Room',
        handle: identity.handle,
        passcode: identity.passcode,
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

  it('participants reflects only connected participants and is keyed on Handle', async () => {
    app = buildTestApp({ stories: ['zork'] });
    const created = await createRoom(app);

    // PH is connected by default (count == 1). Insert two more participants:
    // one connected, one disconnected. Each needs a distinct identity (ADR-159).
    const now = new Date().toISOString();
    const bob = app.seedIdentity();
    const carol = app.seedIdentity();
    app.db
      .prepare(
        `INSERT INTO participants (participant_id, room_id, identity_id, token, tier,
                                   muted, connected, is_successor, joined_at)
         VALUES (?, ?, ?, ?, 'participant', 0, 1, 0, ?)`,
      )
      .run('conn-2', created.room_id, bob.id, 'tok-2', now);
    app.db
      .prepare(
        `INSERT INTO participants (participant_id, room_id, identity_id, token, tier,
                                   muted, connected, is_successor, joined_at)
         VALUES (?, ?, ?, ?, 'participant', 0, 0, 0, ?)`,
      )
      .run('disc-3', created.room_id, carol.id, 'tok-3', now);

    const res = await app.fetch('/api/rooms');
    const body = (await res.json()) as {
      rooms: Array<{ room_id: string; participants: Array<{ handle: string }> }>;
    };
    expect(body.rooms).toHaveLength(1);
    const handles = body.rooms[0]?.participants.map((p) => p.handle) ?? [];
    // Two connected: PH (created by createRoom) + Bob. Carol is disconnected.
    expect(handles).toHaveLength(2);
    // Bob's seeded handle starts with 'tst' so the alpha sort is determinable
    // only against the PH's own handle. Just assert Bob is present and Carol
    // isn't, plus that the array is sorted.
    expect(handles).toContain(bob.handle);
    expect(handles).not.toContain(carol.handle);
    expect(handles).toEqual([...handles].sort());
  });

  it('participants list is empty for a room with one connected PH and surfaces only Handles, not ids', async () => {
    app = buildTestApp({ stories: ['zork'] });
    const created = await createRoom(app, { title: 'Solo' });

    const res = await app.fetch('/api/rooms');
    const body = (await res.json()) as {
      rooms: Array<{
        room_id: string;
        participants: Array<{ handle: string }>;
      }>;
    };
    const summary = body.rooms.find((r) => r.room_id === created.room_id);
    expect(summary).toBeDefined();
    expect(summary?.participants).toHaveLength(1);
    // Each entry must be a `{ handle }` shape only — no participant_id, no
    // identity_id, no token-shaped values.
    const entry = summary?.participants[0];
    expect(entry && Object.keys(entry)).toEqual(['handle']);
    expect(typeof entry?.handle).toBe('string');
    expect(entry?.handle.length).toBeGreaterThan(0);
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
