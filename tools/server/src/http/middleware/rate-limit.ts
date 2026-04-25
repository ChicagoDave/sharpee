/**
 * Per-IP sliding-window rate limiter.
 *
 * Public interface: {@link RateLimiter}, {@link createRateLimiter},
 * {@link rateLimitMiddleware}.
 * Bounded context: HTTP layer (ADR-159 Resolved Implementation Choice #3 —
 * 10 attempts/min on identity create + reclaim).
 *
 * Uses an in-process Map keyed by client IP. A sliding window keeps the
 * timestamps of recent attempts; a request is admitted iff the window's
 * count is below the limit. Attempts that come in over the limit return
 * 429 with a `Retry-After` header (seconds until the oldest entry exits
 * the window).
 *
 * Single-process scope by design — a multi-instance deployment would need a
 * Redis-backed implementation. ADR-159 explicitly accepts the single-process
 * scope for v1.
 */

import type { MiddlewareHandler } from 'hono';
import { HttpError } from './error-envelope.js';

export interface RateLimiter {
  /**
   * Check whether `key` (typically an IP) is currently allowed. On a hit, the
   * call records the attempt and returns `{ allowed: true }`. On a miss, the
   * call returns `{ allowed: false, retryAfterSeconds }` and does NOT record
   * the rejected attempt — failing closed without amplifying the bucket cost.
   */
  check(key: string, now?: number): { allowed: true } | { allowed: false; retryAfterSeconds: number };
}

export interface RateLimitOptions {
  /** Window length in milliseconds. */
  windowMs: number;
  /** Max attempts permitted within the window. */
  max: number;
  /** Optional clock injection for tests. Defaults to `Date.now`. */
  now?: () => number;
}

/** Build an in-process sliding-window limiter. */
export function createRateLimiter(opts: RateLimitOptions): RateLimiter {
  const buckets = new Map<string, number[]>();
  const now = opts.now ?? (() => Date.now());

  function pruneAndCount(key: string, currentMs: number): number[] {
    const cutoff = currentMs - opts.windowMs;
    const existing = buckets.get(key) ?? [];
    const fresh = existing.filter((t) => t > cutoff);
    if (fresh.length !== existing.length) {
      // Compact the bucket to keep memory bounded for clients that go quiet
      // after a burst.
      buckets.set(key, fresh);
    }
    return fresh;
  }

  return {
    check(key, nowOverride) {
      const t = nowOverride ?? now();
      const fresh = pruneAndCount(key, t);
      if (fresh.length >= opts.max) {
        const oldest = fresh[0]!;
        const retryAfterMs = oldest + opts.windowMs - t;
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
        };
      }
      fresh.push(t);
      buckets.set(key, fresh);
      return { allowed: true };
    },
  };
}

/**
 * Hono middleware that fronts a route with a {@link RateLimiter}. The key is
 * derived from `X-Forwarded-For` (first hop) when present, falling back to
 * the connection remote address. Tests that don't proxy can rely on the
 * fallback or set the header explicitly.
 */
export function rateLimitMiddleware(limiter: RateLimiter): MiddlewareHandler {
  return async (c, next) => {
    const xff = c.req.header('x-forwarded-for');
    const ip = xff ? xff.split(',')[0]!.trim() : (c.env as { remoteAddr?: string })?.remoteAddr ?? 'unknown';
    const result = limiter.check(ip);
    if (!result.allowed) {
      c.header('Retry-After', String(result.retryAfterSeconds));
      throw new HttpError(429, 'rate_limited', 'too many requests; slow down');
    }
    await next();
  };
}
