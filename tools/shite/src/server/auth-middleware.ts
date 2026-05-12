/**
 * @module @sharpee/zifmia/server/auth-middleware
 * @purpose Fastify preHandler that resolves the caller's identity from
 *   the request itself. Per the ADR-161 amendment of 2026-05-12: handle
 *   IS the credential. The middleware reads `handle` from the request
 *   body (POST/PUT/DELETE) or `?handle=` query string (GET / fallback),
 *   looks up the row, and attaches the resolved `Identity` to the
 *   request. Used by every state-changing route (room create, command,
 *   saves, restore, admin).
 * @owner Zifmia server (tools/zifmia/server).
 *
 * Failure modes:
 *   - `401 { error: 'unauthenticated' }` — no handle in the request
 *   - `404 { error: 'unknown_handle' }` — handle not in the identities
 *     table. Distinguished from "missing handle" so the client can
 *     route to the right UX (set up identity vs. handle was erased
 *     out from under you).
 *
 * Admin gating sits on top of this: `adminMiddleware` runs after
 * `authMiddleware` and 403s when `request.identity!.isAdmin` is false.
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
}

/**
 * Extract the caller's claimed handle from a Fastify request.
 *  - For methods with a body (POST/PUT/DELETE) the handle lives in
 *    `body.handle`.
 *  - For GET the handle lives in the `?handle=` query string.
 *  - The two fall through to each other so callers can pass it
 *    either way without the middleware caring.
 */
function extractHandle(request: FastifyRequest): string | null {
  const body = request.body as { handle?: unknown } | null | undefined;
  if (body && typeof body.handle === 'string' && body.handle.length > 0) {
    return body.handle;
  }
  const query = request.query as { handle?: unknown } | null | undefined;
  if (query && typeof query.handle === 'string' && query.handle.length > 0) {
    return query.handle;
  }
  return null;
}

/**
 * Build the Fastify preHandler. Resolves the identity from the
 * request's `handle` field; on success populates `request.identity`
 * and falls through.
 */
export function authMiddleware(
  options: AuthMiddlewareOptions
): preHandlerHookHandler {
  return async function authPreHandler(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const handle = extractHandle(request);
    if (!handle) {
      reply.code(401).send({ error: 'unauthenticated' });
      return;
    }
    const identity = await options.adapter.getIdentityByHandle(handle);
    if (!identity) {
      reply.code(404).send({ error: 'unknown_handle' });
      return;
    }
    request.identity = identity;
  };
}
