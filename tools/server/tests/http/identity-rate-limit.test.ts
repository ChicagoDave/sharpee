/**
 * Per-IP rate limit on identity create + reclaim — ADR-159 Resolved
 * Implementation Choice #3 (10/min sliding window).
 *
 * Behavior Statement — rateLimitMiddleware
 *   DOES: admits up to N requests per window per IP; on the (N+1)th request
 *         within the window, throws 429 rate_limited and sets a Retry-After
 *         header; entries age out of the bucket as the window slides.
 *   WHEN: fronts the identity create + reclaim routes.
 *   BECAUSE: brute-force on a 128-bit UUID is infeasible regardless, but the
 *            limiter keeps log noise down and stops trivial scrapers.
 *   REJECTS WHEN: bucket count >= max → 429 with Retry-After (seconds).
 *
 * The route-level test uses the production wiring in `createApp` directly so
 * we cover the configured limit (10/min) without overriding it. Lower-level
 * windowing/aging behavior is left to the unit-level test on the limiter
 * itself; this file validates only the HTTP-surface contract.
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

  it('allows up to 10 requests, then returns 429 rate_limited with Retry-After', async () => {
    const xff = '203.0.113.42';

    // 10 successes (using unique usernames so the route itself is happy).
    for (let i = 0; i < 10; i++) {
      const res = await app.fetch('/api/identities', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': xff,
        },
        body: JSON.stringify({ username: `user${i}` }),
      });
      expect(res.status).toBe(201);
    }

    // 11th in the same window from the same IP — rejected.
    const eleventh = await app.fetch('/api/identities', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': xff,
      },
      body: JSON.stringify({ username: 'overflow' }),
    });
    expect(eleventh.status).toBe(429);
    expect(((await eleventh.json()) as { code: string }).code).toBe('rate_limited');
    const retryAfter = eleventh.headers.get('Retry-After');
    expect(retryAfter).toBeTruthy();
    expect(Number(retryAfter)).toBeGreaterThan(0);
  });

  it('limit is per-IP — a different IP is not affected', async () => {
    // Burn the limit on IP A.
    const ipA = '198.51.100.1';
    for (let i = 0; i < 10; i++) {
      await app.fetch('/api/identities', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': ipA },
        body: JSON.stringify({ username: `a${i}` }),
      });
    }
    const blocked = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ipA },
      body: JSON.stringify({ username: 'a-extra' }),
    });
    expect(blocked.status).toBe(429);

    // IP B is independent.
    const ipB = '198.51.100.2';
    const ok = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ipB },
      body: JSON.stringify({ username: 'fresh-ip' }),
    });
    expect(ok.status).toBe(201);
  });

  it('reclaim shares the bucket with create (both routes count against the same per-IP window)', async () => {
    // Create one identity using a separate IP so this setup doesn't deplete
    // the shared-bucket IP we're about to test.
    const setupIp = '198.51.100.10';
    const created = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': setupIp },
      body: JSON.stringify({ username: 'shared' }),
    });
    const { secret } = (await created.json()) as { secret: string };

    const xff = '198.51.100.99';
    // Mix create + reclaim across the same IP.
    for (let i = 0; i < 5; i++) {
      const r1 = await app.fetch('/api/identities', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': xff },
        body: JSON.stringify({ username: `mix${i}` }),
      });
      expect(r1.status).toBe(201);
    }
    for (let i = 0; i < 5; i++) {
      const r2 = await app.fetch('/api/identities/reclaim', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': xff },
        body: JSON.stringify({ username: 'shared', secret }),
      });
      expect(r2.status).toBe(200);
    }

    // 11th request on the shared bucket — even via the reclaim route — is rejected.
    const overflow = await app.fetch('/api/identities/reclaim', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': xff },
      body: JSON.stringify({ username: 'shared', secret }),
    });
    expect(overflow.status).toBe(429);
  });
});
