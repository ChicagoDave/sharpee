/**
 * POST /api/rooms behavior tests.
 *
 * Behavior Statement — createRoomRoute (ADR-161 Phase B)
 *   DOES: inserts one `rooms` row, one `participants` row (tier=primary_host)
 *         whose `identity_id` references the server-internal `id` resolved
 *         from `(handle, passcode)`, and two `session_events` rows
 *         (lifecycle/created, join/false) — all in one DB transaction.
 *         The join event's `display_name` payload is sourced from
 *         `identity.handle`, not from any per-request string. Returns 201
 *         with room_id, join_code, token, participant_id, and
 *         tier=primary_host.
 *   WHEN: a POST carries a valid body `(story_slug, title, handle, passcode)`,
 *         a CAPTCHA token the verifier accepts, a known handle, and a
 *         passcode that verifies against the stored hash.
 *   BECAUSE: a room is the primitive; the creator is the Primary Host;
 *            audit log entries must accompany every mutation (ADR-153
 *            Decision 11). ADR-161 closes the auth gap: every
 *            identity-bearing route resolves the caller via credentials,
 *            not a bare `id` from the body.
 *   REJECTS WHEN: body is missing → 400 bad_request; any of (story_slug,
 *                 title, handle, passcode) missing → 400 missing_field;
 *                 title >80 chars → 400 invalid_title; CAPTCHA fails →
 *                 400 captcha_failed; story unknown → 400 unknown_story;
 *                 story unhealthy at boot → 500 story_load_failed;
 *                 handle unknown → 404 unknown_handle; passcode mismatch
 *                 → 401 bad_passcode. In every reject path, NO row is
 *                 written.
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

  it('happy path: valid body → 201 with token, participant_id, join_code; participant bound to resolved id', async () => {
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

    // State assertions: room, participant whose identity_id references the
    // server-internal id (NOT anything from the body), two events.
    const roomRow = app.db.prepare('SELECT * FROM rooms WHERE room_id = ?').get(body.room_id);
    expect(roomRow).toBeDefined();

    const participantRow = app.db
      .prepare('SELECT tier, identity_id FROM participants WHERE participant_id = ?')
      .get(body.participant_id) as { tier: string; identity_id: string } | undefined;
    expect(participantRow?.tier).toBe('primary_host');
    expect(participantRow?.identity_id).toBe(identity.id);

    const eventCount = (app.db
      .prepare('SELECT COUNT(*) AS n FROM session_events WHERE room_id = ?')
      .get(body.room_id) as { n: number }).n;
    expect(eventCount).toBe(2);

    // The join event's display_name is the resolved identity.handle, not any
    // per-request string. (Single-source-of-truth invariant.)
    const joinEvent = app.db
      .prepare(
        "SELECT payload FROM session_events WHERE room_id = ? AND kind = 'join'",
      )
      .get(body.room_id) as { payload: string };
    const parsed = JSON.parse(joinEvent.payload) as { display_name: string };
    expect(parsed.display_name).toBe(identity.handle);
  });

  it('happy path with REAL argon2: full credential round-trip (Integration Reality)', async () => {
    // Real-path test for the ADR-161 auth-uniformity contract: end-to-end
    // POST /api/identities → POST /api/rooms with the returned credentials,
    // exercising the production HashService (argon2id) — not the stub.
    app.cleanup();
    app = buildTestApp({ stories: ['zork'], realHashService: true });

    const idRes = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'realalice' }),
    });
    expect(idRes.status).toBe(201);
    const identity = (await idRes.json()) as {
      id: string;
      handle: string;
      passcode: string;
    };

    const res = await app.fetch('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        story_slug: 'zork',
        title: 'Real Argon2',
        handle: identity.handle,
        passcode: identity.passcode,
        captcha_token: 'stub',
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { participant_id: string };
    const row = app.db
      .prepare('SELECT identity_id FROM participants WHERE participant_id = ?')
      .get(body.participant_id) as { identity_id: string } | undefined;
    expect(row?.identity_id).toBe(identity.id);
  }, 30_000);

  it('missing handle → 400 missing_field, no room written', async () => {
    const res = await app.fetch('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        story_slug: 'zork',
        title: 'Beta',
        passcode: 'pc-anything',
        captcha_token: 'stub',
      }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('missing_field');

    const count = (app.db.prepare('SELECT COUNT(*) AS n FROM rooms').get() as { n: number }).n;
    expect(count).toBe(0);
  });

  it('missing passcode → 400 missing_field, no room written', async () => {
    const res = await app.fetch('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        story_slug: 'zork',
        title: 'Beta',
        handle: 'alice',
        captcha_token: 'stub',
      }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('missing_field');

    const count = (app.db.prepare('SELECT COUNT(*) AS n FROM rooms').get() as { n: number }).n;
    expect(count).toBe(0);
  });

  it('unknown handle → 404 unknown_handle, no room written (AC-5)', async () => {
    const res = await app.fetch('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        story_slug: 'zork',
        title: 'Beta',
        handle: 'nobody',
        passcode: 'pc-irrelevant',
        captcha_token: 'stub',
      }),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('unknown_handle');

    const count = (app.db.prepare('SELECT COUNT(*) AS n FROM rooms').get() as { n: number }).n;
    expect(count).toBe(0);
  });

  it('wrong passcode → 401 bad_passcode, no room written (AC-5)', async () => {
    const identity = app.seedIdentity();
    const res = await app.fetch('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        story_slug: 'zork',
        title: 'Beta',
        handle: identity.handle,
        passcode: `${identity.passcode}-wrong`,
        captcha_token: 'stub',
      }),
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('bad_passcode');

    const count = (app.db.prepare('SELECT COUNT(*) AS n FROM rooms').get() as { n: number }).n;
    expect(count).toBe(0);
  });

  it('unknown story_slug → 400 unknown_story, no room written', async () => {
    const identity = app.seedIdentity();
    const res = await app.fetch('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        story_slug: 'does-not-exist',
        title: 'Unknown Story Test',
        handle: identity.handle,
        passcode: identity.passcode,
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
    const identity = app.seedIdentity();

    const res = await app.fetch('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        story_slug: 'zork',
        title: 'Captcha Test',
        handle: identity.handle,
        passcode: identity.passcode,
        captcha_token: 'will-be-rejected',
      }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('captcha_failed');

    const count = (app.db.prepare('SELECT COUNT(*) AS n FROM rooms').get() as { n: number }).n;
    expect(count).toBe(0);
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

  it('story marked unhealthy at boot → 500 story_load_failed; no row written (N-6)', async () => {
    app.cleanup();
    app = buildTestApp({
      stories: ['zork', 'broken'],
      unhealthyStories: { broken: 'sandbox crashed before READY: module not found' },
    });
    const identity = app.seedIdentity();

    const res = await app.fetch('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        story_slug: 'broken',
        title: 'Attempt',
        handle: identity.handle,
        passcode: identity.passcode,
        captcha_token: 'stub',
      }),
    });

    expect(res.status).toBe(500);
    const body = (await res.json()) as { code: string; detail: string };
    expect(body.code).toBe('story_load_failed');
    expect(body.detail).toMatch(/module not found/);

    // No partial row anywhere.
    const roomCount = (app.db.prepare('SELECT COUNT(*) as c FROM rooms').get() as {
      c: number;
    }).c;
    const participantCount = (app.db
      .prepare('SELECT COUNT(*) as c FROM participants')
      .get() as { c: number }).c;
    const eventCount = (app.db
      .prepare('SELECT COUNT(*) as c FROM session_events')
      .get() as { c: number }).c;
    expect(roomCount).toBe(0);
    expect(participantCount).toBe(0);
    expect(eventCount).toBe(0);
  });

  it('missing title → 400 missing_field, no room written', async () => {
    const res = await app.fetch('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        story_slug: 'zork',
        handle: 'alice',
        passcode: 'pc-irrelevant',
        captcha_token: 'stub',
      }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('missing_field');
    const rooms = (app.db.prepare('SELECT COUNT(*) AS c FROM rooms').get() as { c: number }).c;
    expect(rooms).toBe(0);
  });

  it('whitespace-only title → 400 missing_field', async () => {
    const res = await app.fetch('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        story_slug: 'zork',
        title: '   \t  ',
        handle: 'alice',
        passcode: 'pc-irrelevant',
        captcha_token: 'stub',
      }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('missing_field');
  });

  it('title longer than 80 chars → 400 invalid_title', async () => {
    const overlong = 'x'.repeat(81);
    const res = await app.fetch('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        story_slug: 'zork',
        title: overlong,
        handle: 'alice',
        passcode: 'pc-irrelevant',
        captcha_token: 'stub',
      }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('invalid_title');
  });

  it('title of exactly 80 chars → 201 (boundary accepted)', async () => {
    const exactly80 = 'x'.repeat(80);
    const identity = app.seedIdentity();
    const res = await app.fetch('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        story_slug: 'zork',
        title: exactly80,
        handle: identity.handle,
        passcode: identity.passcode,
        captcha_token: 'stub',
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { room_id: string };
    const row = app.db
      .prepare('SELECT title FROM rooms WHERE room_id = ?')
      .get(body.room_id) as { title: string } | undefined;
    expect(row?.title).toBe(exactly80);
  });

  it('story healthy at boot → happy path unchanged', async () => {
    app.cleanup();
    app = buildTestApp({
      stories: ['zork'],
      // No unhealthyStories override — zork is implicitly healthy.
    });
    const identity = app.seedIdentity();

    const res = await app.fetch('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        story_slug: 'zork',
        title: 'Ok',
        handle: identity.handle,
        passcode: identity.passcode,
        captcha_token: 'stub',
      }),
    });
    expect(res.status).toBe(201);
  });
});
