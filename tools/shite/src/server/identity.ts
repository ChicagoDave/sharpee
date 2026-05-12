/**
 * @module @sharpee/zifmia/server/identity
 * @purpose Identity routes per ADR-161, amended 2026-05-12 to drop the
 *   passcode entirely:
 *   - `POST /api/identities` — claim a handle. Server stores
 *     `(id, handle, created_at, is_admin)` and returns the row.
 *     Handle uniqueness is enforced; concurrent claims of the same
 *     handle resolve to one 201 and one 409.
 *   - `POST /api/identities/erase` — hard-delete the row by handle.
 *     The handle becomes immediately re-claimable.
 *
 * @owner Zifmia server (tools/zifmia/server).
 *
 * Threat model: the handle IS the entire credential. Anyone who claims
 * `alice` on any device becomes alice. Per the small-IF-community
 * trust posture set by David 2026-05-12. No tokens, no sessions, no
 * hashes — the handle round-trips in-band on every state-changing
 * request (body field on POST, `?handle=` on GET, WS `hello` frame).
 *
 * Compared to ADR-161 as written, this drops:
 *   - passcode generation + argon2id
 *   - CSV download/upload (no secret to protect)
 *   - session tokens (no login round-trip needed)
 *   - the `passcode_hash` column on `identities`
 */

import type { FastifyInstance } from 'fastify';

import type { StorageAdapter } from '../storage/adapter';

export interface IdentityRouteOptions {
  adapter: StorageAdapter;
}

interface ClaimBody {
  handle?: unknown;
}

interface ErasureBody {
  handle?: unknown;
}

/**
 * ADR-161 prescribes 3–12 alphabetic. Zifmia's earlier `register/login`
 * routes used a looser pattern; the rewrite tightens to the ADR.
 */
const HANDLE_PATTERN = /^[A-Za-z]+$/;
const HANDLE_MIN = 3;
const HANDLE_MAX = 12;

function parseHandle(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (value.length < HANDLE_MIN || value.length > HANDLE_MAX) return null;
  if (!HANDLE_PATTERN.test(value)) return null;
  return value;
}

export function registerIdentityRoutes(
  app: FastifyInstance,
  options: IdentityRouteOptions
): void {
  // ── POST /api/identities ──────────────────────────────────────
  app.post('/api/identities', async (request, reply) => {
    const body = request.body as ClaimBody | null;
    const handle = parseHandle(body?.handle);
    if (!handle) {
      return reply.code(400).send({
        error: 'invalid_handle',
        detail: 'handle must be 3-12 alphabetic characters'
      });
    }

    // Pre-check so the common-case error returns a clean 409. The DB
    // UNIQUE index on (handle) is the source of truth on the race
    // path — concurrent inserts fall back to the catch.
    const existing = await options.adapter.getIdentityByHandle(handle);
    if (existing) {
      return reply.code(409).send({ error: 'handle_taken' });
    }

    try {
      const identity = await options.adapter.createIdentity({ handle });
      return reply.code(201).send({
        id: identity.id,
        handle: identity.handle,
        isAdmin: identity.isAdmin
      });
    } catch (err) {
      // Race fallback. `better-sqlite3` reports UNIQUE collisions with
      // 'UNIQUE constraint failed' in the message.
      if (err instanceof Error && /UNIQUE/i.test(err.message)) {
        return reply.code(409).send({ error: 'handle_taken' });
      }
      throw err;
    }
  });

  // ── POST /api/identities/erase ────────────────────────────────
  // No verification — anyone who knows the handle can erase it. That
  // matches the model: handle IS the credential. Erase frees the
  // handle immediately.
  app.post('/api/identities/erase', async (request, reply) => {
    const body = request.body as ErasureBody | null;
    const handle = parseHandle(body?.handle);
    if (!handle) {
      return reply.code(400).send({
        error: 'invalid_handle',
        detail: 'handle must be 3-12 alphabetic characters'
      });
    }
    const existing = await options.adapter.getIdentityByHandle(handle);
    if (!existing) {
      return reply.code(404).send({ error: 'unknown_handle' });
    }
    await options.adapter.deleteIdentityByHandle(handle);
    return reply.code(200).send({ erased: handle });
  });
}
