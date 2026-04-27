/**
 * POST /api/identities/erase — hard-delete a persistent identity (ADR-161).
 *
 * Public interface: {@link registerEraseIdentityRoute},
 * {@link EraseIdentityDeps}.
 * Wire types (`EraseIdentityRequest`, `EraseIdentityResponse`) live in
 * `../../wire/http-api.ts` — shared with the browser client.
 *
 * Bounded context: HTTP layer (ADR-161 Decision: Identity lifecycle / Erase).
 *
 * The route authenticates `(handle, passcode)`, terminates every live WS
 * connection bound to the resolved identity with close code 4007
 * `identity_erased`, then hard-deletes the row. The freed Handle becomes
 * reclaimable (AC-7).
 *
 * Order matters: `closeIdentitySockets` runs BEFORE `identities.delete`
 * so any in-flight WS close handler that touches DB state during teardown
 * (presence broadcast, session-event append) sees the identity row still
 * present and never trips an FK-checked read against a row that vanished
 * mid-handler. Once `identities.delete` fires, the schema's
 * `ON DELETE CASCADE` on `participants.identity_id` removes that
 * identity's participant rows in the same transaction; rooms left empty
 * by the cascade are recycled by the existing PH-grace / sweeper paths.
 */

import type { Hono, MiddlewareHandler } from 'hono';
import type { IdentitiesRepository } from '../../repositories/identities.js';
import type { HashService } from '../../auth/hash-service.js';
import type { ConnectionManager } from '../../ws/connection-manager.js';
import { HttpError } from '../middleware/error-envelope.js';
import type { EraseIdentityResponse } from '../../wire/http-api.js';

export interface EraseIdentityDeps {
  identities: IdentitiesRepository;
  hashService: HashService;
  /**
   * Required — erase MUST terminate every live WS bound to the identity.
   * Skipping this is a security gap (a still-connected client could keep
   * acting as the just-deleted identity until the next hello). Tests that
   * don't drive any sockets pass an empty ConnectionManager; production
   * passes the live one.
   */
  connections: ConnectionManager;
  /** Optional rate-limit middleware. Tests omit when not exercising the limit. */
  rateLimit?: MiddlewareHandler;
}

interface EraseIdentityBody {
  handle?: unknown;
  passcode?: unknown;
}

const passthrough: MiddlewareHandler = async (_c, next) => {
  await next();
};

export function registerEraseIdentityRoute(app: Hono, deps: EraseIdentityDeps): void {
  app.post('/api/identities/erase', deps.rateLimit ?? passthrough, async (c) => {
    const body = (await c.req.json().catch(() => null)) as EraseIdentityBody | null;
    if (!body) throw new HttpError(400, 'bad_request', 'JSON body required');

    const handle = typeof body.handle === 'string' ? body.handle : '';
    const passcode = typeof body.passcode === 'string' ? body.passcode : '';
    if (!handle) throw new HttpError(400, 'missing_field', 'handle is required');
    if (!passcode) throw new HttpError(400, 'missing_field', 'passcode is required');

    const auth = deps.identities.findHashByHandle(handle);
    if (!auth) {
      throw new HttpError(404, 'unknown_handle', 'no identity with that handle');
    }

    const ok = await deps.hashService.verify(passcode, auth.passcode_hash);
    if (!ok) {
      throw new HttpError(401, 'bad_passcode', 'incorrect passcode for that handle');
    }

    // Close before delete — see module header for rationale.
    deps.connections.closeIdentitySockets(auth.id, 4007, 'identity_erased');
    deps.identities.delete(auth.id);

    const response: EraseIdentityResponse = { erased: true };
    return c.json(response, 200);
  });
}
