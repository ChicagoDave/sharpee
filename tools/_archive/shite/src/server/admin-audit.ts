/**
 * @module @sharpee/zifmia/server/admin-audit
 * @purpose `GET /admin/audit` — admin-gated read of the `audit_log`
 *   table. Emits the rows in reverse-chronological order (adapter
 *   contract: `listAuditEntries` orders ts DESC). Pagination via
 *   `?sinceTs=<unix-ms>` and `?limit=<1..1000>`.
 * @owner Zifmia server (tools/zifmia/server).
 *
 * Per ADR-175 §Resolved Open Questions (2026-05-11) — OQ-6: the audit
 * log captures `story.install/upgrade/remove`, `room.create/kill`,
 * `identity.passcode_reset`, and `command.submit` (with full command
 * text). This route exposes those rows to admins.
 *
 * Wire shape:
 *   - 200 `{ entries: AuditEntry[] }` — newest first
 *   - 400 `{ error: 'invalid_query', detail }` — bad sinceTs / limit
 *   - 401 / 403 — handled by the composed [auth, admin] preHandlers
 */

import type { FastifyInstance } from 'fastify';

import { adminMiddleware } from './admin-middleware';
import { authMiddleware } from './auth-middleware';
import type { StorageAdapter } from '../storage/adapter';
import type { AuditEntry } from '../storage/types';

export interface AdminAuditRouteOptions {
  adapter: StorageAdapter;
}

/** Hard cap independent of the adapter's own default. Protects
 * against an admin client asking for "everything" on a multi-million
 * row table. */
const MAX_LIMIT = 1000;

interface ParsedQuery {
  sinceTs?: number;
  limit?: number;
}

interface QueryParseSuccess {
  ok: true;
  parsed: ParsedQuery;
}
interface QueryParseFailure {
  ok: false;
  detail: string;
}

function parseQuery(query: unknown): QueryParseSuccess | QueryParseFailure {
  if (typeof query !== 'object' || query === null) {
    return { ok: true, parsed: {} };
  }
  const q = query as Record<string, unknown>;
  const parsed: ParsedQuery = {};

  if (q.sinceTs !== undefined) {
    const raw = q.sinceTs;
    const n = typeof raw === 'string' ? Number(raw) : raw;
    if (typeof n !== 'number' || !Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
      return { ok: false, detail: 'sinceTs_must_be_nonneg_integer' };
    }
    parsed.sinceTs = n;
  }

  if (q.limit !== undefined) {
    const raw = q.limit;
    const n = typeof raw === 'string' ? Number(raw) : raw;
    if (typeof n !== 'number' || !Number.isFinite(n) || !Number.isInteger(n)) {
      return { ok: false, detail: 'limit_must_be_integer' };
    }
    if (n < 1 || n > MAX_LIMIT) {
      return { ok: false, detail: 'limit_out_of_range' };
    }
    parsed.limit = n;
  }

  return { ok: true, parsed };
}

/**
 * Register `GET /admin/audit`. Composes auth + admin preHandlers.
 */
export function registerAdminAuditRoute(
  app: FastifyInstance,
  options: AdminAuditRouteOptions
): void {
  const auth = authMiddleware({ adapter: options.adapter });
  const admin = adminMiddleware();

  app.get(
    '/admin/audit',
    { preHandler: [auth, admin] },
    async (request, reply) => {
      const parseResult = parseQuery(request.query);
      if (!parseResult.ok) {
        return reply
          .code(400)
          .send({ error: 'invalid_query', detail: parseResult.detail });
      }
      const entries: AuditEntry[] = await options.adapter.listAuditEntries(
        parseResult.parsed
      );
      return reply.code(200).send({ entries });
    }
  );
}
