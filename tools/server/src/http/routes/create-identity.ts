/**
 * POST /api/identities — create a new persistent identity.
 *
 * Public interface: {@link registerCreateIdentityRoute}, {@link CreateIdentityDeps},
 * {@link CreateIdentityResponse}.
 * Bounded context: HTTP layer (ADR-159 Decision: Identity lifecycle / Create).
 *
 * Generates `(identity_id, secret)` server-side, hashes the secret with
 * argon2id, persists `(identity_id, username, secret_hash)`, and returns
 * `(identity_id, username, secret)` to the caller. The plaintext secret is
 * returned exactly once; the server cannot recover it later.
 *
 * Username constraints (ADR-159 Resolved Implementation Choice #2):
 *   - 3–32 characters
 *   - `[A-Za-z0-9_-]+`
 *   - Case-insensitive uniqueness; original case preserved for display.
 */

import type { Hono, MiddlewareHandler } from 'hono';
import { randomUUID } from 'node:crypto';
import type { IdentitiesRepository } from '../../repositories/identities.js';
import type { HashService } from '../../auth/hash-service.js';
import { HttpError } from '../middleware/error-envelope.js';

export interface CreateIdentityDeps {
  identities: IdentitiesRepository;
  hashService: HashService;
  /**
   * Optional rate-limit middleware. When supplied, it fronts the route. Tests
   * that don't exercise rate limiting omit it.
   */
  rateLimit?: MiddlewareHandler;
}

export interface CreateIdentityResponse {
  identity_id: string;
  username: string;
  /** Plaintext UUIDv4 — returned exactly once. */
  secret: string;
}

interface CreateIdentityBody {
  username?: unknown;
}

const USERNAME_PATTERN = /^[A-Za-z0-9_-]+$/;
const USERNAME_MIN = 3;
const USERNAME_MAX = 32;

/**
 * Pass-through middleware used when no rate-limiter is supplied. Lets the
 * route's signature stay uniform whether or not the limiter is wired in.
 */
const passthrough: MiddlewareHandler = async (_c, next) => {
  await next();
};

export function registerCreateIdentityRoute(app: Hono, deps: CreateIdentityDeps): void {
  app.post('/api/identities', deps.rateLimit ?? passthrough, async (c) => {
    const body = (await c.req.json().catch(() => null)) as CreateIdentityBody | null;
    if (!body) throw new HttpError(400, 'bad_request', 'JSON body required');

    const username = typeof body.username === 'string' ? body.username : '';
    if (!username) throw new HttpError(400, 'missing_field', 'username is required');
    if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
      throw new HttpError(
        400,
        'invalid_username',
        `username must be ${USERNAME_MIN}–${USERNAME_MAX} characters`
      );
    }
    if (!USERNAME_PATTERN.test(username)) {
      throw new HttpError(
        400,
        'invalid_username',
        'username may only contain letters, digits, underscore, hyphen'
      );
    }

    // Pre-check uniqueness so the common-case error returns 409 with a clean
    // detail. The DB UNIQUE index is the source of truth — a race between two
    // concurrent creates falls back to the catch below.
    if (deps.identities.findByUsername(username)) {
      throw new HttpError(409, 'username_taken', 'that username is already in use');
    }

    const secret = randomUUID();
    const secret_hash = await deps.hashService.hash(secret);

    let identity;
    try {
      identity = deps.identities.create({ username, secret_hash });
    } catch (err) {
      // Race-condition fallback: another concurrent request created the same
      // username between our pre-check and our insert. Return 409 with the
      // same code as the pre-check path.
      if (err instanceof Error && /UNIQUE/i.test(err.message)) {
        throw new HttpError(409, 'username_taken', 'that username is already in use');
      }
      throw err;
    }

    const response: CreateIdentityResponse = {
      identity_id: identity.identity_id,
      username: identity.username,
      secret,
    };
    return c.json(response, 201);
  });
}
