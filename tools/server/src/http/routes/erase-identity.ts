/**
 * POST /api/identities/erase — hard-delete a persistent identity (ADR-161).
 *
 * Public interface: {@link registerEraseIdentityRoute},
 * {@link EraseIdentityDeps}, {@link EraseIdentityResponse}.
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
 * mid-handler. Once the close handlers complete (asynchronously, off the
 * HTTP request path), the participants left behind by the erased identity
 * are stranded — subsequent reads through the participants repo's joins
 * will fail FK lookups, which is the intended terminal state. Recycling
 * the rooms they belonged to is a separate concern handled by the PH-grace
 * path.
 */

import type { Hono, MiddlewareHandler } from 'hono';
import type { IdentitiesRepository } from '../../repositories/identities.js';
import type { HashService } from '../../auth/hash-service.js';
import type { ConnectionManager } from '../../ws/connection-manager.js';
import { HttpError } from '../middleware/error-envelope.js';

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

export interface EraseIdentityResponse {
  erased: true;
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
