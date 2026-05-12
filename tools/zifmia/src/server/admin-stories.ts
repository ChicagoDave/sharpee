/**
 * @module @sharpee/zifmia/server/admin-stories
 * @purpose Admin story-library routes — `POST/PUT/DELETE/GET
 *   /admin/stories[/:id]`. Implements ADR-175 §AC-1 (admin install via
 *   HTTP), §AC-5 (install/upgrade/remove without breaking pinned
 *   rooms), and §AC-12 (no partial library writes on validation
 *   failure).
 * @owner Zifmia server (tools/zifmia/server).
 *
 * Per ADR-175 §Resolved Open Questions (2026-05-11):
 *   - OQ-1: direct install (one POST) — no staging gate.
 *   - OQ-3: bundled admin port, role-gated via `adminMiddleware`.
 *   - OQ-6: every successful admin action emits an audit row.
 *
 * Bundle protocol (decided 2026-05-12):
 *   - `Content-Type: application/octet-stream`; body is the entire
 *     `.sharpee` zip.
 *   - Server extracts `id`, `version`, `ifid`, `title`, `formatVersion`
 *     from the bundle's `meta.json`. There is no separate metadata
 *     channel; the bundle is the single source of truth.
 *   - "Signature" validation is reserved in the error-code enum
 *     (`bad_signature`) but NOT emitted in v1. When bundle signing
 *     lands, this is where the check goes.
 *
 * Validation order (short-circuits on first failure):
 *   1. structure  — zip parses; meta.json + story.js present;
 *                   meta.format === 'sharpee-story'; id/version/title
 *                   are non-empty strings → else `bad_structure`.
 *   2. (signature — reserved, not emitted v1)
 *   3. ifid       — non-empty string → else `missing_ifid`.
 *   4. format     — `formatVersion === 1` → else `unsupported_format`.
 *
 * Wire shape:
 *   - 201 / 200  on install / upgrade success: full `StoryLibraryEntry`.
 *   - 204        on delete success.
 *   - 400        missing body bytes (`invalid_body`).
 *   - 404        unknown :id on PUT/DELETE (`story_not_found`).
 *   - 409        same `(id, version)` already installed
 *                (`invalid_bundle / version_already_installed`).
 *   - 422        validation failure (`invalid_bundle / <detail>`).
 *   - 401 / 403  via the [auth, admin] preHandler chain.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { unzipSync } from 'fflate';

import { adminMiddleware } from './admin-middleware';
import { authMiddleware } from './auth-middleware';
import type { StorageAdapter } from '../storage/adapter';
import type { StoryLibraryEntry } from '../storage/types';

export interface AdminStoryRoutesOptions {
  adapter: StorageAdapter;
}

/** Maximum accepted bundle size. Big enough for a substantial
 * story.js + assets; small enough to keep a misbehaving client from
 * filling memory. Hardcoded for now; revisit if production stories
 * routinely exceed this. */
const MAX_BUNDLE_BYTES = 50 * 1024 * 1024; // 50 MB

/** The only `formatVersion` Phase 5 accepts. */
const SUPPORTED_FORMAT_VERSION = 1;

export interface BundleMeta {
  id: string;
  version: string;
  ifid: string;
  title: string;
  formatVersion: number;
}

/** Detail codes used in 422 / 409 / 400 responses. `bad_signature` is
 * documented for forward-compat but never emitted in v1. */
export type BundleValidationDetail =
  | 'bad_structure'
  | 'bad_signature'
  | 'missing_ifid'
  | 'unsupported_format';

export type ValidateBundleResult =
  | { ok: true; meta: BundleMeta }
  | { ok: false; detail: BundleValidationDetail };

/**
 * Pure validator. Decodes the zip, walks the validation order, and
 * either returns the extracted `BundleMeta` or the first failure
 * detail. No I/O — caller is responsible for DB writes.
 */
export function validateStoryBundle(bytes: Uint8Array): ValidateBundleResult {
  // 1. Structure — zip parses + required files present.
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    return { ok: false, detail: 'bad_structure' };
  }
  const metaBytes = files['meta.json'];
  const storyJs = files['story.js'];
  if (!metaBytes || !storyJs) {
    return { ok: false, detail: 'bad_structure' };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder().decode(metaBytes));
  } catch {
    return { ok: false, detail: 'bad_structure' };
  }
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, detail: 'bad_structure' };
  }
  const meta = raw as Record<string, unknown>;
  if (meta.format !== 'sharpee-story') {
    return { ok: false, detail: 'bad_structure' };
  }
  const id = meta.id;
  const version = meta.version;
  const title = meta.title;
  if (typeof id !== 'string' || id.length === 0) {
    return { ok: false, detail: 'bad_structure' };
  }
  if (typeof version !== 'string' || version.length === 0) {
    return { ok: false, detail: 'bad_structure' };
  }
  if (typeof title !== 'string' || title.length === 0) {
    return { ok: false, detail: 'bad_structure' };
  }

  // 2. Signature — reserved for v2; not emitted.

  // 3. IFID — must exist and be non-empty.
  const ifid = meta.ifid;
  if (typeof ifid !== 'string' || ifid.length === 0) {
    return { ok: false, detail: 'missing_ifid' };
  }

  // 4. Format version — only 1 is supported in v1.
  const formatVersion = meta.formatVersion;
  if (
    typeof formatVersion !== 'number' ||
    formatVersion !== SUPPORTED_FORMAT_VERSION
  ) {
    return { ok: false, detail: 'unsupported_format' };
  }

  return {
    ok: true,
    meta: { id, version, ifid, title, formatVersion },
  };
}

/** Asserted by routes — `request.body` is a Buffer once the
 * application/octet-stream content-type parser fires. */
function bodyAsBytes(body: unknown): Uint8Array | null {
  if (Buffer.isBuffer(body)) {
    return body.length > 0 ? new Uint8Array(body) : null;
  }
  return null;
}

interface AuditOk {
  actorId: string;
  action: 'story.install' | 'story.upgrade' | 'story.remove';
  storyId: string;
  detail: Record<string, unknown>;
}

async function tryAudit(
  adapter: StorageAdapter,
  log: { error: (obj: unknown, msg: string) => void },
  entry: AuditOk,
): Promise<void> {
  try {
    await adapter.appendAuditEntry({
      actorId: entry.actorId,
      action: entry.action,
      targetKind: 'story',
      targetId: entry.storyId,
      detail: JSON.stringify(entry.detail),
    });
  } catch (auditErr) {
    log.error(
      { err: auditErr, storyId: entry.storyId, action: entry.action },
      'admin-stories: audit_write_failed',
    );
  }
}

/**
 * Register the four `/admin/stories` routes. Adds an
 * `application/octet-stream` body parser scoped to this Fastify
 * instance (idempotent if registered twice on the same instance —
 * Fastify will throw, but the server bootstrap only registers once).
 */
export function registerAdminStoryRoutes(
  app: FastifyInstance,
  options: AdminStoryRoutesOptions,
): void {
  const auth = authMiddleware({ adapter: options.adapter });
  const admin = adminMiddleware();
  const preHandler = [auth, admin];

  // Raw-bytes parser for the install + upgrade routes. Other content
  // types fall through to Fastify's existing parsers (JSON, etc.).
  app.addContentTypeParser(
    'application/octet-stream',
    { parseAs: 'buffer', bodyLimit: MAX_BUNDLE_BYTES },
    async (_req: FastifyRequest, body: Buffer) => body,
  );

  app.post(
    '/admin/stories',
    { preHandler, bodyLimit: MAX_BUNDLE_BYTES },
    async (request, reply) => {
      const bytes = bodyAsBytes(request.body);
      if (!bytes) {
        return reply
          .code(400)
          .send({ error: 'invalid_body', detail: 'missing_bundle_bytes' });
      }
      const validation = validateStoryBundle(bytes);
      if (!validation.ok) {
        return reply
          .code(422)
          .send({ error: 'invalid_bundle', detail: validation.detail });
      }
      const { meta } = validation;

      const existing = await options.adapter.getStoryLibraryEntry(
        meta.id,
        meta.version,
      );
      if (existing) {
        return reply.code(409).send({
          error: 'invalid_bundle',
          detail: 'version_already_installed',
        });
      }

      const installed: StoryLibraryEntry =
        await options.adapter.installStoryBundle({
          storyId: meta.id,
          version: meta.version,
          ifid: meta.ifid,
          title: meta.title,
          installedBy: request.identity!.id,
          bundle: bytes,
        });

      await tryAudit(options.adapter, request.log, {
        actorId: request.identity!.id,
        action: 'story.install',
        storyId: meta.id,
        detail: {
          storyId: meta.id,
          version: meta.version,
          ifid: meta.ifid,
          title: meta.title,
        },
      });

      return reply.code(201).send(installed);
    },
  );

  app.put(
    '/admin/stories/:id',
    { preHandler, bodyLimit: MAX_BUNDLE_BYTES },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const bytes = bodyAsBytes(request.body);
      if (!bytes) {
        return reply
          .code(400)
          .send({ error: 'invalid_body', detail: 'missing_bundle_bytes' });
      }
      const validation = validateStoryBundle(bytes);
      if (!validation.ok) {
        return reply
          .code(422)
          .send({ error: 'invalid_bundle', detail: validation.detail });
      }
      const { meta } = validation;

      if (meta.id !== id) {
        return reply
          .code(422)
          .send({ error: 'invalid_bundle', detail: 'story_id_mismatch' });
      }

      const allVersions = await options.adapter.listStories();
      const existing = allVersions.filter((s) => s.storyId === id);
      if (existing.length === 0) {
        return reply.code(404).send({ error: 'story_not_found' });
      }
      if (existing.some((s) => s.version === meta.version)) {
        return reply.code(409).send({
          error: 'invalid_bundle',
          detail: 'version_already_installed',
        });
      }

      const installed: StoryLibraryEntry =
        await options.adapter.installStoryBundle({
          storyId: meta.id,
          version: meta.version,
          ifid: meta.ifid,
          title: meta.title,
          installedBy: request.identity!.id,
          bundle: bytes,
        });

      await tryAudit(options.adapter, request.log, {
        actorId: request.identity!.id,
        action: 'story.upgrade',
        storyId: meta.id,
        detail: {
          storyId: meta.id,
          version: meta.version,
          ifid: meta.ifid,
          title: meta.title,
          previousVersions: existing.map((s) => s.version),
        },
      });

      return reply.code(200).send(installed);
    },
  );

  app.delete(
    '/admin/stories/:id',
    { preHandler },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const allVersions = await options.adapter.listStories();
      const existing = allVersions.filter((s) => s.storyId === id);
      if (existing.length === 0) {
        return reply.code(404).send({ error: 'story_not_found' });
      }

      await options.adapter.removeStory(id);

      await tryAudit(options.adapter, request.log, {
        actorId: request.identity!.id,
        action: 'story.remove',
        storyId: id,
        detail: {
          storyId: id,
          versionsAffected: existing.map((s) => s.version),
        },
      });

      return reply.code(204).send();
    },
  );

  app.get('/admin/stories', { preHandler }, async (_request, reply) => {
    const stories = await options.adapter.listStories();
    return reply.code(200).send({ stories });
  });
}
