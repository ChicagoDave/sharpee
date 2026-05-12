/**
 * @module @sharpee/zifmia/server/admin-middleware
 * @purpose Fastify preHandler that gates `/admin/*` routes on the
 *   `identities.is_admin` bit. Composes with `authMiddleware` —
 *   register `authMiddleware` first so `request.identity` is
 *   populated, then `adminMiddleware` to enforce the role.
 * @owner Zifmia server (tools/zifmia/server).
 *
 * Per ADR-175 §Resolved Open Questions (2026-05-11) — OQ-3 resolution:
 * the admin surface is bundled into the main port and gated by an
 * `is_admin` role rather than running on a separate port.
 *
 * Wire-shape contract:
 *   - missing `request.identity` (auth was not run, defensive)
 *       → 401 `{ error: 'unauthenticated' }`
 *   - `request.identity.isAdmin !== true`
 *       → 403 `{ error: 'forbidden' }`
 *   - admin → fall through (no state change, no body sent)
 */

import type { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';

/**
 * Build the Fastify preHandler. No options — the middleware reads
 * `request.identity.isAdmin` populated by `authMiddleware`.
 */
export function adminMiddleware(): preHandlerHookHandler {
  return async function adminPreHandler(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    if (!request.identity) {
      reply.code(401).send({ error: 'unauthenticated' });
      return;
    }
    if (request.identity.isAdmin !== true) {
      reply.code(403).send({ error: 'forbidden' });
      return;
    }
  };
}
