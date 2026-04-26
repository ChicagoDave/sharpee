/**
 * GET /r/:code behavior tests.
 *
 * Behavior Statement — resolveCodeRoute
 *   DOES: returns room summary fields (room_id, title, story_slug, pinned)
 *         for a known join code.
 *   WHEN: a browser follows the join URL.
 *   BECAUSE: the client needs the room_id to call POST /api/rooms/:room_id/join.
 *   REJECTS WHEN: the code is unknown or the room has been deleted → 404.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, type TestAppHandle } from '../helpers/test-app.js';

async function createRoom(app: TestAppHandle) {
  const identity = app.seedIdentity();
  const res = await app.fetch('/api/rooms', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      story_slug: 'zork',
      title: 'Beta',
      handle: identity.handle,
      passcode: identity.passcode,
      captcha_token: 'stub',
    }),
  });
  return (await res.json()) as { room_id: string; join_code: string };
}

describe('GET /r/:code', () => {
  let app: TestAppHandle;

  beforeEach(() => {
    app = buildTestApp({ stories: ['zork'] });
  });
  afterEach(() => {
    app.cleanup();
  });

  it('returns room metadata for a known code', async () => {
    const { room_id, join_code } = await createRoom(app);
    const res = await app.fetch(`/r/${join_code}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      room_id: string;
      title: string;
      story_slug: string;
      pinned: boolean;
    };
    expect(body.room_id).toBe(room_id);
    expect(body.title).toBe('Beta');
    expect(body.story_slug).toBe('zork');
    expect(body.pinned).toBe(false);
  });

  it('unknown code → 404 room_not_found', async () => {
    const res = await app.fetch('/r/NOPE42');
    expect(res.status).toBe(404);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('room_not_found');
  });

  it('deleted room code → 404', async () => {
    const { room_id, join_code } = await createRoom(app);
    // Simulate delete — Phase 10 will expose the HTTP endpoint; here we use the repo directly.
    app.db.pragma('foreign_keys = ON');
    app.db.prepare('DELETE FROM rooms WHERE room_id = ?').run(room_id);

    const res = await app.fetch(`/r/${join_code}`);
    expect(res.status).toBe(404);
  });
});
