/**
 * Identity HTTP routes per ADR-177 §4.
 *
 * Public interface: {@link registerIdentityRoutes}.
 * Owner: zifmia server, HTTP surface.
 *
 * Routes:
 *   POST /api/identities         { handle } -> 201 { id, handle, is_admin } | 400 | 409
 *   POST /api/identities/erase   { handle } -> 200 { erased: boolean }
 *
 * Per ADR-161 amended, the handle is the entire credential. No proof
 * of ownership is required to erase — the threat model accepts that
 * anyone who knows a handle can claim or erase that identity.
 */

import type { FastifyInstance } from 'fastify';
import type { IdentityRepository } from './repository.js';
import type { RoomsHub } from '../ws/rooms-hub.js';
import { CLOSE_CODES } from '../ws/types.js';

interface IdentityBody {
  handle?: unknown;
}

export interface IdentityRoutesDeps {
  /** Optional WS hub for the 4007 teardown on erase. */
  hub?: RoomsHub;
}

/**
 * Register identity routes on a Fastify instance.
 *
 * @param app    The Fastify instance (or scoped plugin).
 * @param repo   The IdentityRepository to delegate persistence to.
 * @param deps   Optional dependencies (WS hub for erase teardown).
 */
export function registerIdentityRoutes(
  app: FastifyInstance,
  repo: IdentityRepository,
  deps: IdentityRoutesDeps = {}
): void {
  app.post<{ Body: IdentityBody }>('/api/identities', async (request, reply) => {
    const handle = request.body?.handle;
    const result = repo.createIdentity(handle);
    if (!result.ok) {
      if (result.error === 'invalid_handle') {
        return reply.code(400).send({ error: 'invalid_handle' });
      }
      // handle_taken
      return reply.code(409).send({ error: 'handle_taken' });
    }
    return reply.code(201).send({
      id: result.identity.id,
      handle: result.identity.handle,
      is_admin: result.identity.is_admin
    });
  });

  app.post<{ Body: IdentityBody }>('/api/identities/erase', async (request, reply) => {
    const handle = request.body?.handle;

    // Resolve identity BEFORE delete so we can close WS sockets by id.
    const existing = repo.getByHandle(handle);
    const result = repo.eraseIdentity(handle);

    // Per ADR-177 §5: close any open WS connections attached to that
    // handle with code 4007 immediately after the DB write commits.
    // CASCADE removed participants rows; the hub still holds sockets
    // by identityId.
    if (result.erased && existing && deps.hub) {
      deps.hub.closeForIdentity(existing.id, CLOSE_CODES.IDENTITY_ERASED);
    }
    return reply.code(200).send({ erased: result.erased });
  });
}
