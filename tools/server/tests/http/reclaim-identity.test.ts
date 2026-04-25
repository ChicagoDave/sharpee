/**
 * POST /api/identities/reclaim behavior tests.
 *
 * Behavior Statement — reclaimIdentityRoute
 *   DOES: looks up the identity by case-insensitive username; verifies the
 *         presented secret against the stored hash; on success returns
 *         (identity_id, canonical-case username) and advances last_seen_at;
 *         on failure returns the appropriate error envelope.
 *   WHEN: a returning user on a fresh device pastes their (username, secret)
 *         to recover their identity.
 *   BECAUSE: ADR-159 cold-reclaim path; identity is the precondition for
 *            seeing prior room memberships.
 *   REJECTS WHEN: missing field → 400; unknown username → 404
 *                 unknown_identity; wrong secret → 401 bad_credentials.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, type TestAppHandle } from '../helpers/test-app.js';

async function createIdentity(
  app: TestAppHandle,
  username: string
): Promise<{ identity_id: string; username: string; secret: string }> {
  const res = await app.fetch('/api/identities', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  if (res.status !== 201) {
    throw new Error(`createIdentity: expected 201, got ${res.status}`);
  }
  return (await res.json()) as { identity_id: string; username: string; secret: string };
}

describe('POST /api/identities/reclaim', () => {
  let app: TestAppHandle;

  beforeEach(() => {
    app = buildTestApp();
  });
  afterEach(() => {
    app.cleanup();
  });

  it('happy path: correct credentials → 200 with identity_id and canonical username', async () => {
    const created = await createIdentity(app, 'Bob');
    const res = await app.fetch('/api/identities/reclaim', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'bob', secret: created.secret }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { identity_id: string; username: string };
    expect(body.identity_id).toBe(created.identity_id);
    // Canonical case preserved on response, even though the request used a different case.
    expect(body.username).toBe('Bob');
    // No secret on the reclaim response.
    expect(body).not.toHaveProperty('secret');
  });

  it('unknown username → 404 unknown_identity', async () => {
    const res = await app.fetch('/api/identities/reclaim', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'ghost', secret: 'whatever' }),
    });
    expect(res.status).toBe(404);
    expect(((await res.json()) as { code: string }).code).toBe('unknown_identity');
  });

  it('wrong secret for known username → 401 bad_credentials', async () => {
    await createIdentity(app, 'Carol');
    const res = await app.fetch('/api/identities/reclaim', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'Carol', secret: 'definitely-wrong' }),
    });
    expect(res.status).toBe(401);
    expect(((await res.json()) as { code: string }).code).toBe('bad_credentials');
  });

  it('missing username → 400 missing_field', async () => {
    const res = await app.fetch('/api/identities/reclaim', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: 'x' }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('missing_field');
  });

  it('missing secret → 400 missing_field', async () => {
    const res = await app.fetch('/api/identities/reclaim', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'someone' }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('missing_field');
  });

  it('successful reclaim advances last_seen_at on the identity row', async () => {
    const created = await createIdentity(app, 'Dave');
    const beforeRow = app.db
      .prepare('SELECT last_seen_at FROM identities WHERE identity_id = ?')
      .get(created.identity_id) as { last_seen_at: string };

    await new Promise((r) => setTimeout(r, 15));
    await app.fetch('/api/identities/reclaim', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'Dave', secret: created.secret }),
    });

    const afterRow = app.db
      .prepare('SELECT last_seen_at FROM identities WHERE identity_id = ?')
      .get(created.identity_id) as { last_seen_at: string };
    expect(afterRow.last_seen_at > beforeRow.last_seen_at).toBe(true);
  });

  // Real-path: full create + reclaim cycle through the production argon2 path.
  it('real argon2: end-to-end create → reclaim succeeds', async () => {
    app.cleanup();
    app = buildTestApp({ realHashService: true });
    const created = await createIdentity(app, 'realreclaim');
    const res = await app.fetch('/api/identities/reclaim', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'realreclaim', secret: created.secret }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { identity_id: string };
    expect(body.identity_id).toBe(created.identity_id);
  }, 10_000);

  it('real argon2: wrong secret → 401 bad_credentials', async () => {
    app.cleanup();
    app = buildTestApp({ realHashService: true });
    await createIdentity(app, 'realwrong');
    const res = await app.fetch('/api/identities/reclaim', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'realwrong', secret: 'definitely-not-the-secret' }),
    });
    expect(res.status).toBe(401);
    expect(((await res.json()) as { code: string }).code).toBe('bad_credentials');
  }, 10_000);
});
