/**
 * @module @sharpee/zifmia/server/admin-identities
 * @purpose Admin identity routes:
 *   - `GET /admin/identities?handle=...` — exact-match handle lookup,
 *     used by the admin UI to resolve a row before issuing an erase.
 *     Returns `{identities: PublicIdentity[]}` (0 or 1 entries).
 *   - `POST /admin/identities/:id/erase` — admin-driven hard delete.
 *     The user obtains their freed handle out-of-band; they re-claim
 *     it (or pick a different one) via `POST /api/identities`.
 *
 * @owner Zifmia server (tools/zifmia/server).
 *
 * Per the 2026-05-12 amendment to ADR-161: identities have no
 * passcode. The previous "passcode reset" admin action is therefore
 * not a thing — the equivalent recovery UX is "admin erases the row,
 * user re-claims the same handle." That's what this module does.
 *
 * Audit:
 *   - `identity.erase` with the original handle in the detail.
 */

import type { FastifyInstance } from 'fastify';

import { adminMiddleware } from './admin-middleware';
import { authMiddleware } from './auth-middleware';
import type { StorageAdapter } from '../storage/adapter';

export interface AdminIdentityRoutesOptions {
  adapter: StorageAdapter;
}

export function registerAdminIdentityRoutes(
  app: FastifyInstance,
  options: AdminIdentityRoutesOptions,
): void {
  const auth = authMiddleware({ adapter: options.adapter });
  const admin = adminMiddleware();
  const preHandler = [auth, admin];

  // ── GET /admin/identities ───────────────────────────────────────
  // Exact-match handle lookup. Handle is the natural key the admin
  // will know; a missing-handle request returns 400 rather than
  // dumping every identity row to the wire.
  //
  // The auth middleware already consumed a `?handle=` query param to
  // identify the admin caller. We accept the lookup target as
  // `?target=` to avoid the collision.
  app.get(
    '/admin/identities',
    { preHandler },
    async (request, reply) => {
      const query = request.query as { target?: unknown } | undefined;
      const target = typeof query?.target === 'string' ? query.target : null;
      if (!target || target.length === 0) {
        return reply
          .code(400)
          .send({ error: 'invalid_query', detail: 'missing_target' });
      }
      const identity = await options.adapter.getIdentityByHandle(target);
      if (!identity) {
        return reply.code(200).send({ identities: [] });
      }
      return reply.code(200).send({
        identities: [
          {
            id: identity.id,
            handle: identity.handle,
            isAdmin: identity.isAdmin,
            createdAt: identity.createdAt,
          },
        ],
      });
    },
  );

  // ── POST /admin/identities/:id/erase ────────────────────────────
  // Admin-driven hard delete. Mirrors `POST /api/identities/erase`
  // but identifies the target by `:id` so the admin can erase a
  // handle they would not otherwise know how to type (e.g., a
  // user who has forgotten the exact case or spelling).
  app.post(
    '/admin/identities/:id/erase',
    { preHandler },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const identity = await options.adapter.getIdentityById(id);
      if (!identity) {
        return reply.code(404).send({ error: 'identity_not_found' });
      }
      await options.adapter.deleteIdentityByHandle(identity.handle);

      try {
        await options.adapter.appendAuditEntry({
          actorId: request.identity!.id,
          action: 'identity.erase',
          targetKind: 'identity',
          targetId: id,
          detail: JSON.stringify({
            identityId: id,
            handle: identity.handle,
          }),
        });
      } catch (auditErr) {
        request.log.error(
          { err: auditErr, identityId: id },
          'admin-identities: audit_write_failed',
        );
      }

      return reply.code(200).send({
        erased: identity.handle,
        identityId: id,
      });
    },
  );
}
