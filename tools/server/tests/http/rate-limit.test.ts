/**
 * Sliding-window RateLimiter unit tests.
 *
 * Behavior Statement — RateLimiter
 *   DOES: admits requests until the window's count reaches `max`, then
 *         rejects with `retryAfterSeconds` until the oldest entry ages out;
 *         entries older than `windowMs` are pruned on the next check; per-key
 *         buckets are independent.
 *   WHEN: fronted by `rateLimitMiddleware` on the identity routes (Phase A:
 *         `POST /api/identities`; Phase C will add `/upload` and `/erase`
 *         to the same shared bucket).
 *   BECAUSE: ADR-161 — 10 attempts/min sliding window per IP.
 *   REJECTS WHEN: count >= max in the current window. Rejected attempts are
 *                 NOT counted against the bucket.
 */

import { describe, expect, it } from 'vitest';
import { createRateLimiter } from '../../src/http/middleware/rate-limit.js';

describe('createRateLimiter', () => {
  it('admits up to max requests in a window', () => {
    let now = 1_000_000;
    const lim = createRateLimiter({ windowMs: 60_000, max: 3, now: () => now });

    expect(lim.check('ip-1').allowed).toBe(true);
    expect(lim.check('ip-1').allowed).toBe(true);
    expect(lim.check('ip-1').allowed).toBe(true);
    const fourth = lim.check('ip-1');
    expect(fourth.allowed).toBe(false);
    if (!fourth.allowed) {
      expect(fourth.retryAfterSeconds).toBeGreaterThan(0);
      expect(fourth.retryAfterSeconds).toBeLessThanOrEqual(60);
    }
  });

  it('rejected attempts are not counted toward the bucket', () => {
    let now = 1_000_000;
    const lim = createRateLimiter({ windowMs: 60_000, max: 2, now: () => now });

    expect(lim.check('ip-1').allowed).toBe(true);
    expect(lim.check('ip-1').allowed).toBe(true);
    // Three rejections in a row.
    expect(lim.check('ip-1').allowed).toBe(false);
    expect(lim.check('ip-1').allowed).toBe(false);
    expect(lim.check('ip-1').allowed).toBe(false);

    // Advance the clock past the window's start; oldest two entries age out.
    now += 60_001;
    // Both successful slots should be available again.
    expect(lim.check('ip-1').allowed).toBe(true);
    expect(lim.check('ip-1').allowed).toBe(true);
    expect(lim.check('ip-1').allowed).toBe(false);
  });

  it('per-key buckets are independent', () => {
    let now = 1_000_000;
    const lim = createRateLimiter({ windowMs: 60_000, max: 2, now: () => now });

    expect(lim.check('a').allowed).toBe(true);
    expect(lim.check('a').allowed).toBe(true);
    expect(lim.check('a').allowed).toBe(false);
    // Different key gets its own budget.
    expect(lim.check('b').allowed).toBe(true);
    expect(lim.check('b').allowed).toBe(true);
    expect(lim.check('b').allowed).toBe(false);
  });

  it('retryAfterSeconds reflects when the oldest entry exits the window', () => {
    let now = 1_000_000;
    const lim = createRateLimiter({ windowMs: 60_000, max: 1, now: () => now });

    lim.check('ip-1'); // recorded at t=1_000_000
    now += 30_000; // half-window in
    const blocked = lim.check('ip-1');
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      // Oldest entry exits at 1_000_000 + 60_000; from now (1_030_000),
      // that's 30 seconds.
      expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(29);
      expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(31);
    }
  });

  it('partial window aging: an old request expires while a newer one stays', () => {
    let now = 1_000_000;
    const lim = createRateLimiter({ windowMs: 60_000, max: 2, now: () => now });

    lim.check('ip-1'); // t=1_000_000
    now += 40_000;
    lim.check('ip-1'); // t=1_040_000
    // Both within window — bucket full.
    expect(lim.check('ip-1').allowed).toBe(false);

    now += 25_000; // t=1_065_000 — first entry aged out, second still in.
    // One slot free.
    expect(lim.check('ip-1').allowed).toBe(true);
    // Now full again.
    expect(lim.check('ip-1').allowed).toBe(false);
  });
});
