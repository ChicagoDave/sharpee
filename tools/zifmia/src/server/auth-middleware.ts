/**
 * @module @sharpee/zifmia/server/auth-middleware
 * @purpose Fastify preHandler that validates the `Authorization: Bearer
 *   <token>` header against the `sessions` table and attaches the
 *   resolved `Identity` to the request. Used by every protected route
 *   from Phase 3b onward (room create, command submission, save
 *   management, admin pages).
 * @owner Zifmia server (tools/zifmia/server).
 *
 * Failure body shape is uniform: `401 { error: 'unauthenticated' }`.
 * Missing header, malformed bearer, unknown token, and expired token
 * are not distinguished on the wire so observers cannot probe for
 * "token exists but expired" — same security-conscious default
 * pattern as AC-11.
 */

import type { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';

import type { StorageAdapter } from '../storage/adapter';
import type { Identity } from '../storage/types';

declare module 'fastify' {
  interface FastifyRequest {
    /** Populated by `authMiddleware` on protected routes; absent
     * otherwise. Downstream handlers may read `request.identity`
     * once the middleware has run. */
    identity?: Identity;
  }
}

export interface AuthMiddlewareOptions {
  adapter: StorageAdapter;
  /** Override the clock (tests pin time). */
  now?: () => number;
}

const BEARER_PREFIX = 'Bearer ';

/**
 * Build the Fastify preHandler. Returns 401 on every failure path
 * with `{ error: 'unauthenticated' }`. On success, populates
 * `request.identity` and falls through.
 */
export function authMiddleware(
  options: AuthMiddlewareOptions
): preHandlerHookHandler {
  const now = options.now ?? Date.now;

  return async function authPreHandler(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const header = request.headers.authorization;
    if (typeof header !== 'string' || !header.startsWith(BEARER_PREFIX)) {
      reply.code(401).send({ error: 'unauthenticated' });
      return;
    }
    const token = header.slice(BEARER_PREFIX.length).trim();
    if (token.length === 0) {
      reply.code(401).send({ error: 'unauthenticated' });
      return;
    }

    const session = await options.adapter.getSessionByToken(token);
    if (!session) {
      reply.code(401).send({ error: 'unauthenticated' });
      return;
    }
    if (session.expiresAt < now()) {
      reply.code(401).send({ error: 'unauthenticated' });
      return;
    }

    const identity = await options.adapter.getIdentityById(session.identityId);
    if (!identity) {
      // Session row references a deleted identity — treat as expired.
      reply.code(401).send({ error: 'unauthenticated' });
      return;
    }

    request.identity = identity;
  };
}
