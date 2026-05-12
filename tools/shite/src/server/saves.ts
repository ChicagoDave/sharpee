/**
 * @module @sharpee/zifmia/server/saves
 * @purpose Named-save endpoints (Phase 4b / AC-6):
 *   - `POST /rooms/:id/saves` — create a named pointer into the
 *     `save_blobs` stream at a specific turn. Label is the
 *     player-facing slot name; `atTurn` defaults to the most recent
 *     turn if omitted.
 *   - `GET /rooms/:id/saves` — list every named save for the room.
 *
 * @owner Zifmia server (tools/zifmia/server).
 *
 * No `DELETE` endpoint by policy: named saves are room-scoped
 * collaborative artifacts, not per-user slots. A save lives as long
 * as the room does; room deletion (Phase 5 admin) cascades the
 * `named_saves` rows. See feedback memory `feedback-no-save-delete`.
 *
 * Auth: both routes require a valid session (same as `/state` and
 * `/command`). Any authenticated identity can list and create — there
 * is no per-save ownership concept exposed beyond the `createdBy`
 * audit field on the row.
 */

import type { FastifyInstance } from 'fastify';

import { authMiddleware } from './auth-middleware';
import type { StorageAdapter } from '../storage/adapter';
import type { NamedSave } from '../storage/types';

export interface SavesRouteOptions {
  adapter: StorageAdapter;
}

interface CreateNamedSaveBody {
  label?: unknown;
  atTurn?: unknown;
}

/** Reject empty / whitespace-only / >80-char labels at the route layer
 * rather than letting them reach the adapter. Same shape as room titles. */
const LABEL_MAX_LENGTH = 80;

interface ParsedSaveBody {
  label: string;
  /** `undefined` means "use the latest save_blob's turn". */
  atTurn: number | undefined;
}

/**
 * Validate `POST /rooms/:id/saves` body. Returns the parsed values or
 * `null` on any malformation; the caller maps `null` to a single
 * `invalid_body` 400 response so we don't leak which specific field
 * failed.
 */
function parseSaveBody(body: unknown): ParsedSaveBody | null {
  if (typeof body !== 'object' || body === null) return null;
  const { label, atTurn } = body as CreateNamedSaveBody;
  if (typeof label !== 'string') return null;
  const trimmed = label.trim();
  if (trimmed.length === 0 || trimmed.length > LABEL_MAX_LENGTH) return null;
  let resolvedAtTurn: number | undefined;
  if (atTurn !== undefined) {
    if (typeof atTurn !== 'number') return null;
    if (!Number.isInteger(atTurn) || atTurn < 1) return null;
    resolvedAtTurn = atTurn;
  }
  return { label: trimmed, atTurn: resolvedAtTurn };
}

export function registerSavesRoutes(
  app: FastifyInstance,
  options: SavesRouteOptions,
): void {
  const auth = authMiddleware({ adapter: options.adapter });

  // ── POST /rooms/:id/saves ─────────────────────────────────────
  app.post(
    '/rooms/:id/saves',
    { preHandler: auth },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = parseSaveBody(request.body);
      if (parsed === null) {
        return reply
          .code(400)
          .send({ error: 'invalid_body', detail: 'malformed_named_save' });
      }
      const identity = request.identity!;

      const room = await options.adapter.getRoom(id);
      if (!room) {
        return reply.code(404).send({ error: 'room_not_found' });
      }

      // Resolve atTurn: explicit number, or the latest save_blob's turn.
      let atTurn = parsed.atTurn;
      if (atTurn === undefined) {
        const latest = await options.adapter.getLatestSaveBlob(id);
        if (!latest) {
          // No turns have been executed yet — no snapshot to pin to.
          return reply.code(400).send({ error: 'no_turns_yet' });
        }
        atTurn = latest.turn;
      } else {
        // Explicit atTurn — verify the save_blob exists. Lets us
        // return a 400 with a meaningful code rather than surfacing
        // the FK violation from the adapter.
        const target = await options.adapter.getSaveBlobAt(id, atTurn);
        if (!target) {
          return reply.code(400).send({ error: 'turn_not_saved' });
        }
      }

      const save = await options.adapter.createNamedSave({
        roomId: id,
        atTurn,
        label: parsed.label,
        createdBy: identity.id,
      });
      return reply.code(201).send(save);
    },
  );

  // ── GET /rooms/:id/saves ──────────────────────────────────────
  app.get(
    '/rooms/:id/saves',
    { preHandler: auth },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const room = await options.adapter.getRoom(id);
      if (!room) {
        return reply.code(404).send({ error: 'room_not_found' });
      }
      const saves: NamedSave[] = await options.adapter.listNamedSaves(id);
      return reply.code(200).send(saves);
    },
  );
}
