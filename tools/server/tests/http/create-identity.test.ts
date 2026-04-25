/**
 * POST /api/identities behavior tests.
 *
 * Behavior Statement — createIdentityRoute
 *   DOES: validates username (3–32 chars, [A-Za-z0-9_-]+); checks
 *         case-insensitive uniqueness; generates identity_id (UUIDv4) and
 *         secret (UUIDv4) server-side; hashes the secret; persists
 *         (identity_id, username, secret_hash); returns 201 with
 *         (identity_id, username, secret).
 *   WHEN: a new visitor without an identity opts to create one.
 *   BECAUSE: identity creation is the precondition for participation under
 *            ADR-159; the secret is shown exactly once and cannot be
 *            recovered server-side.
 *   REJECTS WHEN: missing username → 400 missing_field; invalid format → 400
 *                 invalid_username; collision (case-insensitive) → 409
 *                 username_taken.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, type TestAppHandle } from '../helpers/test-app.js';

describe('POST /api/identities', () => {
  let app: TestAppHandle;

  beforeEach(() => {
    app = buildTestApp();
  });
  afterEach(() => {
    app.cleanup();
  });

  it('happy path: valid username → 201 with identity_id, username, secret', async () => {
    const res = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'Alice' }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { identity_id: string; username: string; secret: string };
    expect(body.identity_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.secret).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.username).toBe('Alice');

    // DB state: identity row persisted with hashed secret.
    const row = app.db
      .prepare('SELECT secret_hash, username FROM identities WHERE identity_id = ?')
      .get(body.identity_id) as { secret_hash: string; username: string };
    expect(row.username).toBe('Alice');
    expect(row.secret_hash).not.toBe(body.secret); // AC-6: never plaintext
    expect(row.secret_hash.length).toBeGreaterThan(8);
  });

  it('missing username → 400 missing_field', async () => {
    const res = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('missing_field');
  });

  it('username too short (< 3 chars) → 400 invalid_username', async () => {
    const res = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'ab' }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('invalid_username');
  });

  it('username too long (> 32 chars) → 400 invalid_username', async () => {
    const res = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'a'.repeat(33) }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('invalid_username');
  });

  it('username with invalid chars → 400 invalid_username', async () => {
    const res = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'has spaces' }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('invalid_username');
  });

  it('username with @ rejected → 400 invalid_username', async () => {
    const res = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'a@b' }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('invalid_username');
  });

  it('underscore and hyphen accepted in username', async () => {
    const res = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'a_b-c' }),
    });
    expect(res.status).toBe(201);
  });

  it('duplicate username (exact case) → 409 username_taken', async () => {
    await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'Alice' }),
    });
    const res = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'Alice' }),
    });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { code: string }).code).toBe('username_taken');
  });

  it('duplicate username (different case) → 409 username_taken (case-insensitive uniqueness)', async () => {
    await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'Alice' }),
    });
    const res = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'ALICE' }),
    });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { code: string }).code).toBe('username_taken');
  });

  it('original case of username preserved in storage and response', async () => {
    const res = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'CaMeLcAsE' }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { username: string };
    expect(body.username).toBe('CaMeLcAsE');
    const row = app.db
      .prepare('SELECT username FROM identities WHERE LOWER(username) = ?')
      .get('camelcase') as { username: string };
    expect(row.username).toBe('CaMeLcAsE');
  });

  it('malformed JSON body → 400 bad_request', async () => {
    const res = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json',
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('bad_request');
  });

  // Real-path integration test (Integration Reality §): exercise the actual
  // argon2id path so AC-6 is verified end-to-end through the route.
  it('real argon2: happy path persists an argon2id hash, not the plaintext', async () => {
    app.cleanup();
    app = buildTestApp({ realHashService: true });
    const res = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'realtest' }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { identity_id: string; secret: string };
    const row = app.db
      .prepare('SELECT secret_hash FROM identities WHERE identity_id = ?')
      .get(body.identity_id) as { secret_hash: string };
    expect(row.secret_hash).toMatch(/^\$argon2id\$/);
    expect(row.secret_hash).not.toBe(body.secret);
  }, 5_000);
});
