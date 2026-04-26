/**
 * POST /api/identities behavior tests (ADR-161).
 *
 * Behavior Statement — createIdentityRoute
 *   DOES: validates handle (3–12 alpha); checks case-insensitive uniqueness;
 *         generates Id (Crockford-8 dashed) via the repository and passcode
 *         (EFF word-pair); hashes the passcode; persists (id, handle,
 *         passcode_hash); returns 201 with (id, handle, passcode).
 *   WHEN: a new visitor without an identity opts to create one.
 *   BECAUSE: identity creation is the precondition for participation under
 *            ADR-161; the passcode is shown exactly once and cannot be
 *            recovered server-side. Cross-device portability uses
 *            download/upload (Phase C), not re-fetch.
 *   REJECTS WHEN: missing handle → 400 missing_field; invalid format
 *                 (length / non-alpha) → 400 invalid_handle; collision
 *                 (case-insensitive) → 409 handle_taken; malformed JSON →
 *                 400 bad_request.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, type TestAppHandle } from '../helpers/test-app.js';
import { ID_PATTERN } from '../../src/identity/id-generator.js';
import { PASSCODE_PATTERN } from '../../src/identity/passcode-generator.js';

describe('POST /api/identities', () => {
  let app: TestAppHandle;

  beforeEach(() => {
    app = buildTestApp();
  });
  afterEach(() => {
    app.cleanup();
  });

  it('happy path: valid handle → 201 with id (Crockford), handle, passcode (word-pair)', async () => {
    const res = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'Alice' }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; handle: string; passcode: string };
    expect(body.id).toMatch(ID_PATTERN);
    expect(body.passcode).toMatch(PASSCODE_PATTERN);
    expect(body.handle).toBe('Alice');

    // DB state: identity row persisted with hashed passcode.
    const row = app.db
      .prepare('SELECT passcode_hash, handle FROM identities WHERE id = ?')
      .get(body.id) as { passcode_hash: string; handle: string };
    expect(row.handle).toBe('Alice');
    expect(row.passcode_hash).not.toBe(body.passcode); // AC-6: never plaintext
    expect(row.passcode_hash.length).toBeGreaterThan(8);
  });

  it('missing handle → 400 missing_field', async () => {
    const res = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('missing_field');
  });

  it('handle too short (< 3 chars) → 400 invalid_handle', async () => {
    const res = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'ab' }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('invalid_handle');
  });

  it('handle too long (> 12 chars) → 400 invalid_handle', async () => {
    const res = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'a'.repeat(13) }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('invalid_handle');
  });

  it('handle with whitespace → 400 invalid_handle', async () => {
    const res = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'has spaces' }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('invalid_handle');
  });

  it('handle with digits → 400 invalid_handle', async () => {
    const res = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'abc123' }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('invalid_handle');
  });

  it('handle with underscore → 400 invalid_handle (alpha only)', async () => {
    const res = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'a_b' }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('invalid_handle');
  });

  it('handle with hyphen → 400 invalid_handle (alpha only)', async () => {
    const res = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'a-b' }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('invalid_handle');
  });

  it('mixed-case alpha at length 3 accepted', async () => {
    const res = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'aBc' }),
    });
    expect(res.status).toBe(201);
  });

  it('alpha at length 12 accepted', async () => {
    const res = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'abcdefghijkl' }),
    });
    expect(res.status).toBe(201);
  });

  it('duplicate handle (exact case) → 409 handle_taken', async () => {
    await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'Alice' }),
    });
    const res = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'Alice' }),
    });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { code: string }).code).toBe('handle_taken');
  });

  it('duplicate handle (different case) → 409 handle_taken (case-insensitive uniqueness)', async () => {
    await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'Alice' }),
    });
    const res = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'ALICE' }),
    });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { code: string }).code).toBe('handle_taken');
  });

  it('original case of handle preserved in storage and response', async () => {
    const res = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'CaMeLcAsE' }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { handle: string };
    expect(body.handle).toBe('CaMeLcAsE');
    const row = app.db
      .prepare('SELECT handle FROM identities WHERE LOWER(handle) = ?')
      .get('camelcase') as { handle: string };
    expect(row.handle).toBe('CaMeLcAsE');
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
      body: JSON.stringify({ handle: 'realtest' }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; passcode: string };
    const row = app.db
      .prepare('SELECT passcode_hash FROM identities WHERE id = ?')
      .get(body.id) as { passcode_hash: string };
    expect(row.passcode_hash).toMatch(/^\$argon2id\$/);
    expect(row.passcode_hash).not.toBe(body.passcode);
  }, 5_000);
});
