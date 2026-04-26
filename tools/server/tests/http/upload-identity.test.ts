/**
 * POST /api/identities/upload behavior tests (ADR-161).
 *
 * Behavior Statement — uploadIdentityRoute
 *   DOES: validates `(id, handle, passcode)` shape, looks up id-row and
 *         handle-row, then either:
 *           - registers a fresh row when neither exists (201);
 *           - accepts and returns the existing row when id+handle are the
 *             same row and the passcode verifies (200);
 *           - rejects with `bad_passcode` / `id_mismatch` / `handle_taken`
 *             per the ADR-161 decision matrix.
 *         On accept and on insert, calls `touchLastSeen(id)` so admin
 *         tooling reflects activity.
 *   WHEN: the client identity-setup panel uploads the contents of a
 *         previously-downloaded identity CSV.
 *   BECAUSE: portability is via download/upload (ADR-161); the matrix
 *            prevents Handle theft via reuse and detects malformed/forged
 *            uploads.
 *   REJECTS WHEN: malformed JSON / missing fields → 400; malformed Id →
 *                 400 malformed_id; out-of-spec Handle → 400
 *                 invalid_handle; passcode mismatch on the same row → 401
 *                 bad_passcode; id-row exists but handle does not match →
 *                 409 id_mismatch; id is unknown but handle is taken →
 *                 409 handle_taken.
 *
 * One real-argon2 happy-path (matrix row 1, register-new) and one real-
 * argon2 wrong-passcode test (matrix row 3) cover the Integration Reality
 * surface; the rest use the stub hash service for speed.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, type TestAppHandle } from '../helpers/test-app.js';
import { ID_PATTERN, generateId } from '../../src/identity/id-generator.js';

describe('POST /api/identities/upload', () => {
  let app: TestAppHandle;

  beforeEach(() => {
    app = buildTestApp();
  });
  afterEach(() => {
    app.cleanup();
  });

  // ---------- format pre-checks ----------

  it('malformed JSON → 400 bad_request', async () => {
    const res = await app.fetch('/api/identities/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('bad_request');
  });

  it('missing id → 400 missing_field', async () => {
    const res = await app.fetch('/api/identities/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'Alice', passcode: 'word-pair' }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('missing_field');
  });

  it('missing handle → 400 missing_field', async () => {
    const res = await app.fetch('/api/identities/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: '1234-ABCD', passcode: 'word-pair' }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('missing_field');
  });

  it('missing passcode → 400 missing_field', async () => {
    const res = await app.fetch('/api/identities/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: '1234-ABCD', handle: 'Alice' }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('missing_field');
  });

  it('malformed id (lowercase) → 400 malformed_id', async () => {
    const res = await app.fetch('/api/identities/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: '1234-abcd', handle: 'Alice', passcode: 'word-pair' }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('malformed_id');
  });

  it('malformed id (missing dash) → 400 malformed_id', async () => {
    const res = await app.fetch('/api/identities/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: '1234ABCD', handle: 'Alice', passcode: 'word-pair' }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('malformed_id');
  });

  it('malformed id (forbidden Crockford letter I) → 400 malformed_id', async () => {
    const res = await app.fetch('/api/identities/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'I234-ABCD', handle: 'Alice', passcode: 'word-pair' }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('malformed_id');
  });

  it('handle too short → 400 invalid_handle', async () => {
    const res = await app.fetch('/api/identities/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: generateId(), handle: 'ab', passcode: 'word-pair' }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('invalid_handle');
  });

  it('handle with digits → 400 invalid_handle', async () => {
    const res = await app.fetch('/api/identities/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: generateId(), handle: 'Alice7', passcode: 'word-pair' }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('invalid_handle');
  });

  // ---------- decision-matrix rows ----------

  it('matrix row 1: neither id nor handle exists → 201 register new', async () => {
    const id = generateId();
    const res = await app.fetch('/api/identities/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, handle: 'Alice', passcode: 'plate-music' }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; handle: string };
    expect(body.id).toBe(id);
    expect(body.handle).toBe('Alice');

    // Persisted in identities table with stub hash.
    const row = app.db
      .prepare('SELECT id, handle, passcode_hash FROM identities WHERE id = ?')
      .get(id) as { id: string; handle: string; passcode_hash: string };
    expect(row).toBeDefined();
    expect(row.handle).toBe('Alice');
    expect(row.passcode_hash).toBe('stub:plate-music');
  });

  it('matrix row 2: id+handle match the same row, passcode verifies → 200 accept existing', async () => {
    const seeded = app.seedIdentity();
    const res = await app.fetch('/api/identities/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: seeded.id,
        handle: seeded.handle,
        passcode: seeded.passcode,
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; handle: string };
    expect(body.id).toBe(seeded.id);
    expect(body.handle).toBe(seeded.handle);
  });

  it('matrix row 3: id+handle match the same row, passcode mismatches → 401 bad_passcode', async () => {
    const seeded = app.seedIdentity();
    const res = await app.fetch('/api/identities/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: seeded.id,
        handle: seeded.handle,
        passcode: 'wrong-passcode',
      }),
    });
    expect(res.status).toBe(401);
    expect(((await res.json()) as { code: string }).code).toBe('bad_passcode');
  });

  it('matrix row 4: id-row exists, no handle row → 409 id_mismatch', async () => {
    const seeded = app.seedIdentity();
    // Seeded row has its own handle; we send the seeded id with a fresh
    // handle that no row owns, which is the "id-row exists, no handle
    // row" case.
    const res = await app.fetch('/api/identities/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: seeded.id,
        handle: 'Eve',
        passcode: seeded.passcode,
      }),
    });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { code: string }).code).toBe('id_mismatch');
  });

  it('matrix row 5: id-row and handle-row exist but are different rows → 409 id_mismatch', async () => {
    const a = app.seedIdentity();
    const b = app.seedIdentity();
    const res = await app.fetch('/api/identities/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: a.id, handle: b.handle, passcode: a.passcode }),
    });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { code: string }).code).toBe('id_mismatch');
  });

  it('matrix row 6: id is unknown, handle is taken → 409 handle_taken', async () => {
    const seeded = app.seedIdentity();
    const res = await app.fetch('/api/identities/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: generateId(),
        handle: seeded.handle,
        passcode: 'plate-music',
      }),
    });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { code: string }).code).toBe('handle_taken');
  });

  // ---------- side-effect assertion ----------

  it('on accept (matrix row 2), touches last_seen_at on the existing row', async () => {
    const seeded = app.seedIdentity();
    // Read the original last_seen_at, then upload, then read again.
    const before = app.db
      .prepare('SELECT last_seen_at FROM identities WHERE id = ?')
      .get(seeded.id) as { last_seen_at: string };

    // Hold for at least 1ms so the new ISO timestamp is strictly greater.
    await new Promise((resolve) => setTimeout(resolve, 5));

    const res = await app.fetch('/api/identities/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: seeded.id,
        handle: seeded.handle,
        passcode: seeded.passcode,
      }),
    });
    expect(res.status).toBe(200);

    const after = app.db
      .prepare('SELECT last_seen_at FROM identities WHERE id = ?')
      .get(seeded.id) as { last_seen_at: string };
    expect(after.last_seen_at > before.last_seen_at).toBe(true);
  });

  it('id is canonical-cased on storage; handle preserves the submitted case', async () => {
    const id = generateId();
    const res = await app.fetch('/api/identities/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, handle: 'CamelCase', passcode: 'plate-music' }),
    });
    expect(res.status).toBe(201);
    const row = app.db
      .prepare('SELECT id, handle FROM identities WHERE id = ?')
      .get(id) as { id: string; handle: string };
    expect(row.id).toBe(id);
    expect(row.id).toMatch(ID_PATTERN);
    expect(row.handle).toBe('CamelCase');
  });
});

describe('POST /api/identities/upload — Integration Reality (real argon2)', () => {
  let app: TestAppHandle;

  beforeEach(() => {
    app = buildTestApp({ realHashService: true });
  });
  afterEach(() => {
    app.cleanup();
  });

  it('row 1 with real argon2: registers new identity, persisted hash is not the plaintext', async () => {
    const id = generateId();
    const passcode = 'plate-music';
    const res = await app.fetch('/api/identities/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, handle: 'Alice', passcode }),
    });
    expect(res.status).toBe(201);

    const row = app.db
      .prepare('SELECT passcode_hash FROM identities WHERE id = ?')
      .get(id) as { passcode_hash: string };
    expect(row.passcode_hash).not.toBe(passcode);
    expect(row.passcode_hash.startsWith('$argon2')).toBe(true);
  });

  it('row 3 with real argon2: wrong passcode is rejected', async () => {
    const id = generateId();
    const passcode = 'right-passcode';

    // First, upload to register the identity (row 1).
    const create = await app.fetch('/api/identities/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, handle: 'Alice', passcode }),
    });
    expect(create.status).toBe(201);

    // Then attempt to "re-upload" with the wrong passcode (row 3 path).
    const reject = await app.fetch('/api/identities/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, handle: 'Alice', passcode: 'wrong-passcode' }),
    });
    expect(reject.status).toBe(401);
    expect(((await reject.json()) as { code: string }).code).toBe('bad_passcode');
  });
});
