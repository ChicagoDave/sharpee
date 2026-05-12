/**
 * @module @sharpee/zifmia/server/admin-identities
 * @purpose Admin identity routes:
 *   - `GET /admin/identities?handle=...` — exact-match handle lookup
 *     used by the admin UI's passcode-reset search (Phase 6f-admin).
 *     Returns `{identities: PublicIdentity[]}` (0 or 1 entries);
 *     `passcodeHash` is never serialized.
 *   - `POST /admin/identities/:id/passcode_reset` — admin
 *     passcode reset. Generates a fresh random passcode, persists its
 *     scrypt hash, invalidates every live session for the identity, and
 *     emits an `identity.passcode_reset` audit row.
 * @owner Zifmia server (tools/zifmia/server).
 *
 * Per ADR-175 §Resolved OQ-6 (2026-05-11): `identity.passcode_reset`
 * is a captured audit action class. Reset is admin-initiated; the
 * user obtains the new passcode out-of-band from the admin (Zifmia
 * has no email infrastructure in v1).
 *
 * Security boundary: the plaintext passcode appears EXACTLY ONCE in
 * the response body of the reset call. It is NOT logged, NOT placed
 * in the audit detail, and NOT stored. If the admin loses it, they
 * can re-run the reset (which generates a different passcode).
 *
 * Wire shape:
 *   - 200 `{passcode, identityId, handle}` on success
 *   - 404 `identity_not_found` when no row exists for `:id`
 *   - 401 / 403 via the [auth, admin] preHandler chain
 */

import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';

import { adminMiddleware } from './admin-middleware';
import { authMiddleware } from './auth-middleware';
import { hashPasscode } from '../auth/passcode';
import type { StorageAdapter } from '../storage/adapter';

export interface AdminIdentityRoutesOptions {
  adapter: StorageAdapter;
}

/** URL-safe alphabet (no ambiguous characters like 0/O, 1/l/I). 16
 * chars from this set is ~92 bits of entropy — well above the
 * passcode min-length of 8 and easy to communicate verbally. */
const PASSCODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const PASSCODE_LENGTH = 16;

function generatePasscode(): string {
  // Sample a byte per character; reject bytes outside the alphabet
  // length's largest multiple of 256 to avoid modulo bias.
  const out: string[] = [];
  const acceptUpTo = Math.floor(256 / PASSCODE_ALPHABET.length) * PASSCODE_ALPHABET.length;
  while (out.length < PASSCODE_LENGTH) {
    const buf = randomBytes(PASSCODE_LENGTH);
    for (const b of buf) {
      if (b >= acceptUpTo) continue;
      out.push(PASSCODE_ALPHABET[b % PASSCODE_ALPHABET.length]!);
      if (out.length === PASSCODE_LENGTH) break;
    }
  }
  return out.join('');
}

export function registerAdminIdentityRoutes(
  app: FastifyInstance,
  options: AdminIdentityRoutesOptions,
): void {
  const auth = authMiddleware({ adapter: options.adapter });
  const admin = adminMiddleware();
  const preHandler = [auth, admin];

  // ── GET /admin/identities ───────────────────────────────────────
  // Exact-match handle lookup. The v1 UX is "admin types a handle to
  // resolve an identityId, then resets the passcode". A full list
  // endpoint is intentionally not supported — handle is the natural
  // key the admin will know, and a missing-handle request returns 400
  // rather than dumping every identity row to the wire.
  app.get(
    '/admin/identities',
    { preHandler },
    async (request, reply) => {
      const query = request.query as { handle?: unknown } | undefined;
      const handle = typeof query?.handle === 'string' ? query.handle : null;
      if (!handle || handle.length === 0) {
        return reply
          .code(400)
          .send({ error: 'invalid_query', detail: 'missing_handle' });
      }
      const identity = await options.adapter.getIdentityByHandle(handle);
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

  app.post(
    '/admin/identities/:id/passcode_reset',
    { preHandler },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const identity = await options.adapter.getIdentityById(id);
      if (!identity) {
        return reply.code(404).send({ error: 'identity_not_found' });
      }

      const newPasscode = generatePasscode();
      const newHash = await hashPasscode(newPasscode);
      await options.adapter.updateIdentityPasscode(id, newHash);
      await options.adapter.deleteSessionsForIdentity(id);

      try {
        // NEVER include the plaintext passcode in the audit row.
        await options.adapter.appendAuditEntry({
          actorId: request.identity!.id,
          action: 'identity.passcode_reset',
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
        passcode: newPasscode,
        identityId: id,
        handle: identity.handle,
      });
    },
  );
}
