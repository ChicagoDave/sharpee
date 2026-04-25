/**
 * POST /api/identities/reclaim — verify `(username, secret)` against a stored
 * identity. Used on cold reclaim (fresh device, paste credentials).
 *
 * Public interface: {@link registerReclaimIdentityRoute},
 * {@link ReclaimIdentityDeps}, {@link ReclaimIdentityResponse}.
 * Bounded context: HTTP layer (ADR-159 Decision: Identity lifecycle / Reclaim).
 *
 * Error codes (ADR-159 Decision: Hello frame contract — same vocabulary):
 *   - 404 `unknown_identity` — username not found.
 *   - 401 `bad_credentials` — username found, secret mismatch.
 *   - 200 — success; returns `(identity_id, username)`. `last_seen_at` is
 *     advanced on the identity row.
 *
 * Public IF community context (ADR-159): existence-leak (distinct error
 * codes for "no such username" vs. "wrong secret") is acceptable.
 */

import type { Hono, MiddlewareHandler } from 'hono';
import type { IdentitiesRepository } from '../../repositories/identities.js';
import type { HashService } from '../../auth/hash-service.js';
import { HttpError } from '../middleware/error-envelope.js';

export interface ReclaimIdentityDeps {
  identities: IdentitiesRepository;
  hashService: HashService;
  /** Optional rate-limit middleware (per-IP). */
  rateLimit?: MiddlewareHandler;
}

export interface ReclaimIdentityResponse {
  identity_id: string;
  username: string;
}

interface ReclaimBody {
  username?: unknown;
  secret?: unknown;
}

const passthrough: MiddlewareHandler = async (_c, next) => {
  await next();
};

export function registerReclaimIdentityRoute(app: Hono, deps: ReclaimIdentityDeps): void {
  app.post('/api/identities/reclaim', deps.rateLimit ?? passthrough, async (c) => {
    const body = (await c.req.json().catch(() => null)) as ReclaimBody | null;
    if (!body) throw new HttpError(400, 'bad_request', 'JSON body required');

    const username = typeof body.username === 'string' ? body.username : '';
    const secret = typeof body.secret === 'string' ? body.secret : '';
    if (!username) throw new HttpError(400, 'missing_field', 'username is required');
    if (!secret) throw new HttpError(400, 'missing_field', 'secret is required');

    const auth = deps.identities.findHashByUsername(username);
    if (!auth) {
      throw new HttpError(404, 'unknown_identity', 'no identity with that username');
    }

    const ok = await deps.hashService.verify(secret, auth.secret_hash);
    if (!ok) {
      throw new HttpError(401, 'bad_credentials', 'incorrect secret for that username');
    }

    deps.identities.touchLastSeen(auth.identity_id);

    // Look up the identity again so the response carries the canonical-case
    // username that was preserved at creation.
    const identity = deps.identities.findById(auth.identity_id);
    if (!identity) {
      // This should be unreachable: findHashByUsername just returned a row,
      // and we don't soft-delete between calls in a single request. If it
      // happens, return a 500.
      throw new HttpError(500, 'internal_error', 'identity vanished mid-request');
    }

    const response: ReclaimIdentityResponse = {
      identity_id: identity.identity_id,
      username: identity.username,
    };
    return c.json(response, 200);
  });
}
