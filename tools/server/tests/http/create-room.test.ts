/**
 * POST /api/rooms behavior tests.
 *
 * Behavior Statement — createRoomRoute
 *   DOES: inserts one `rooms` row, one `participants` row (tier=primary_host),
 *         and two `session_events` rows (lifecycle/created, join/false) —
 *         all in one DB transaction. Returns 201 with room_id, join_code,
 *         token, participant_id, and tier=primary_host.
 *   WHEN: a POST carries a valid body and a CAPTCHA token the verifier accepts.
 *   BECAUSE: a room is the primitive; the creator is the Primary Host;
 *            audit log entries must accompany every mutation (ADR-153 Decision 11).
 *   REJECTS WHEN: body is missing, display_name or story_slug is missing,
 *                 story_slug is unknown, or CAPTCHA fails — in which case
 *                 NO row is written.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, type TestAppHandle } from '../helpers/test-app.js';

describe('POST /api/rooms', () => {
  let app: TestAppHandle;

  beforeEach(() => {
    app = buildTestApp({ stories: ['zork', 'cloak'] });
  });
  afterEach(() => {
    app.cleanup();
  });

  it('happy path: valid body → 201 with token, participant_id, join_code', async () => {
    const res = await app.fetch('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        story_slug: 'zork',
        title: 'Beta',
        display_name: 'Alice',
        captcha_token: 'stub',
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      room_id: string;
      join_code: string;
      token: string;
      tier: string;
      participant_id: string;
      join_url: string;
    };
    expect(body.room_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.token).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.participant_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.tier).toBe('primary_host');
    expect(body.join_url).toBe(`/r/${body.join_code}`);

    // State assertions: exactly one room, one participant with tier=primary_host, two events.
    const roomRow = app.db.prepare('SELECT * FROM rooms WHERE room_id = ?').get(body.room_id);
    expect(roomRow).toBeDefined();

    const participantRow = app.db
      .prepare('SELECT tier FROM participants WHERE participant_id = ?')
      .get(body.participant_id) as { tier: string } | undefined;
    expect(participantRow?.tier).toBe('primary_host');

    const eventCount = (app.db
      .prepare('SELECT COUNT(*) AS n FROM session_events WHERE room_id = ?')
      .get(body.room_id) as { n: number }).n;
    expect(eventCount).toBe(2);
  });

  it('missing display_name → 400 missing_field, no room written', async () => {
    const res = await app.fetch('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ story_slug: 'zork', captcha_token: 'stub' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('missing_field');

    const count = (app.db.prepare('SELECT COUNT(*) AS n FROM rooms').get() as { n: number }).n;
    expect(count).toBe(0);
  });

  it('unknown story_slug → 400 unknown_story, no room written', async () => {
    const res = await app.fetch('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        story_slug: 'does-not-exist',
        display_name: 'Alice',
        captcha_token: 'stub',
      }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('unknown_story');

    const count = (app.db.prepare('SELECT COUNT(*) AS n FROM rooms').get() as { n: number }).n;
    expect(count).toBe(0);
  });

  it('CAPTCHA rejected → 400 captcha_failed; no room in DB (negative-path N-5)', async () => {
    app.cleanup();
    app = buildTestApp({ stories: ['zork'], failCaptcha: true });

    const res = await app.fetch('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        story_slug: 'zork',
        display_name: 'Alice',
        captcha_token: 'will-be-rejected',
      }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('captcha_failed');

    const count = (app.db.prepare('SELECT COUNT(*) AS n FROM rooms').get() as { n: number }).n;
    expect(count).toBe(0);
  });

  it('auto-generates a title when the body omits it', async () => {
    const res = await app.fetch('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        story_slug: 'zork',
        display_name: 'Alice',
        captcha_token: 'stub',
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { room_id: string };
    const row = app.db
      .prepare('SELECT title FROM rooms WHERE room_id = ?')
      .get(body.room_id) as { title: string };
    expect(row.title.length).toBeGreaterThan(0);
    expect(row.title).toContain('zork');
  });

  it('malformed JSON body → 400 bad_request', async () => {
    const res = await app.fetch('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('bad_request');
  });
});
