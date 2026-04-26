/**
 * Per-IP rate limit on identity routes — ADR-161 Resolved Implementation
 * (10/min sliding window). All three identity-shape routes share one
 * bucket: `POST /api/identities`, `POST /api/identities/upload`,
 * `POST /api/identities/erase`. A single per-IP limit applies across the
 * three; an attacker cannot mix-and-match endpoints to triple their
 * brute-force budget.
 *
 * Behavior Statement — rateLimitMiddleware
 *   DOES: admits up to N requests per window per IP across all three
 *         identity routes; on the (N+1)th request within the window
 *         (regardless of which of the three was hit first), throws 429
 *         rate_limited and sets a Retry-After header; entries age out of
 *         the bucket as the window slides.
 *   WHEN: fronts the identity routes.
 *   BECAUSE: brute-force on a 60M passcode space combined with the per-IP
 *            limit is the AC-6 / ADR-161 defense. Limiter also keeps log
 *            noise down and stops trivial scrapers.
 *   REJECTS WHEN: bucket count >= max → 429 with Retry-After (seconds).
 *
 * The route-level test uses the production wiring in `createApp` directly
 * so we cover the configured limit (10/min) without overriding it.
 * Lower-level windowing/aging behavior is left to the unit-level test on
 * the limiter itself; this file validates only the HTTP-surface contract.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, type TestAppHandle } from '../helpers/test-app.js';

describe('Identity routes per-IP rate limit', () => {
  let app: TestAppHandle;

  beforeEach(() => {
    app = buildTestApp();
  });
  afterEach(() => {
    app.cleanup();
  });

  // Distinct alpha-only handles satisfying ADR-161's 3–12 alpha rule.
  const HANDLES = ['usera', 'userb', 'userc', 'userd', 'usere', 'userf', 'userg', 'userh', 'useri', 'userj'];

  it('allows up to 10 requests, then returns 429 rate_limited with Retry-After', async () => {
    const xff = '203.0.113.42';

    for (let i = 0; i < 10; i++) {
      const res = await app.fetch('/api/identities', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': xff,
        },
        body: JSON.stringify({ handle: HANDLES[i] }),
      });
      expect(res.status).toBe(201);
    }

    const eleventh = await app.fetch('/api/identities', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': xff,
      },
      body: JSON.stringify({ handle: 'overflow' }),
    });
    expect(eleventh.status).toBe(429);
    expect(((await eleventh.json()) as { code: string }).code).toBe('rate_limited');
    const retryAfter = eleventh.headers.get('Retry-After');
    expect(retryAfter).toBeTruthy();
    expect(Number(retryAfter)).toBeGreaterThan(0);
  });

  it('limit is per-IP — a different IP is not affected', async () => {
    const ipA = '198.51.100.1';
    for (let i = 0; i < 10; i++) {
      await app.fetch('/api/identities', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': ipA },
        body: JSON.stringify({ handle: `aipa${String.fromCharCode(97 + i)}` }), // aipaa..aipaj
      });
    }
    const blocked = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ipA },
      body: JSON.stringify({ handle: 'aipaextra' }),
    });
    expect(blocked.status).toBe(429);

    // IP B is independent.
    const ipB = '198.51.100.2';
    const ok = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ipB },
      body: JSON.stringify({ handle: 'freshipb' }),
    });
    expect(ok.status).toBe(201);
  });

  it('shared bucket: requests are counted across /api/identities, /upload, /erase', async () => {
    const xff = '198.51.100.99';
    // Seed identities so /upload and /erase have something to operate on.
    // We don't drive the seed through HTTP because that would consume bucket
    // slots before the test starts; the repo seed is bucket-free.
    const seeded = app.seedIdentity();
    const seededForErase = app.seedIdentity();

    // 4 calls to /api/identities (creates).
    const createHandles = ['shca', 'shcb', 'shcc', 'shcd'];
    for (const handle of createHandles) {
      const res = await app.fetch('/api/identities', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': xff },
        body: JSON.stringify({ handle }),
      });
      expect(res.status).toBe(201);
    }

    // 4 calls to /api/identities/upload, all matrix-row 1 (fresh ids).
    for (let i = 0; i < 4; i++) {
      const res = await app.fetch('/api/identities/upload', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': xff },
        body: JSON.stringify({
          // Manually-constructed Crockford ids; the route's regex accepts these.
          id: `1234-ABC${i}`,
          handle: `shup${String.fromCharCode(97 + i)}`,
          passcode: 'plate-music',
        }),
      });
      expect(res.status).toBe(201);
    }

    // Call 9: erase the seeded identity. Now we've used 9/10 slots across
    // all three routes.
    const erase1 = await app.fetch('/api/identities/erase', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': xff },
      body: JSON.stringify({ handle: seeded.handle, passcode: seeded.passcode }),
    });
    expect(erase1.status).toBe(200);

    // Call 10: another erase (the second seeded identity). Used 10/10 now.
    const erase2 = await app.fetch('/api/identities/erase', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': xff },
      body: JSON.stringify({
        handle: seededForErase.handle,
        passcode: seededForErase.passcode,
      }),
    });
    expect(erase2.status).toBe(200);

    // Call 11 — across any of the three — should now hit 429.
    const overflow = await app.fetch('/api/identities/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': xff },
      body: JSON.stringify({
        id: '1234-OVRF',
        handle: 'overflow',
        passcode: 'plate-music',
      }),
    });
    expect(overflow.status).toBe(429);
    expect(((await overflow.json()) as { code: string }).code).toBe('rate_limited');
  });
});
