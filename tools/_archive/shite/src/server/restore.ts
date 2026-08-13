/**
 * @module @sharpee/zifmia/server/restore
 * @purpose `POST /rooms/:id/restore` (Phase 4c / ADR-175 §AC-6) —
 *   destructive rollback to a named save. The route resolves the
 *   `saveId` to its target turn, acquires the per-room lease, deletes
 *   every `save_blobs` row with `turn > target` (and every
 *   `named_saves` row that pointed past `target`), then returns an
 *   empty TurnPacket. The target save_blob is now the room's latest;
 *   the next `POST /command` will restore from it and produce turn
 *   `target + 1`.
 *
 * @owner Zifmia server (tools/zifmia/server).
 *
 * Wire semantics:
 *   - Body: `{ saveId }`. ADR-175 line 313 — restore points at a
 *     named save by id, not an arbitrary turn. Forces named saves
 *     to be the only persistent restore surface.
 *   - Response: `{ turn, blocks, events }` (`TurnPacket`-shaped),
 *     where `turn = save.atTurn` and `blocks`/`events` are empty.
 *     Clients refetch `GET /rooms/:id/state` for the transcript
 *     window — the route does not duplicate that work.
 *
 * Error mapping:
 *
 *   | Cause                                       | HTTP | Body shape                              |
 *   | ------------------------------------------- | ---- | --------------------------------------- |
 *   | Missing/expired/invalid session             | 401  | `{ error: 'unauthenticated' }`          |
 *   | Body missing `saveId` or wrong shape        | 400  | `{ error: 'invalid_body', detail }`     |
 *   | `:id` unknown                               | 404  | `{ error: 'room_not_found' }`           |
 *   | `saveId` not found                          | 404  | `{ error: 'save_not_found' }`           |
 *   | Save belongs to a different room            | 409  | `{ error: 'save_room_mismatch' }`       |
 *   | Target save_blob row is missing (FK gap)    | 500  | `{ error: 'restore_failed' }`           |
 *   | Target envelope fails to decode             | 500  | `{ error: 'restore_failed' }`           |
 *
 * WebSocket fan-out (mirrors Phase 3d.iii turn fan-out):
 *
 *   On success: `room:restored {roomId, atTurn, by, savedLabel}` is
 *   broadcast to every subscriber whose identity is NOT the submitter
 *   (the submitter has the HTTP response). Lock is force-released and
 *   `lock:state { holder: null }` broadcast to every subscriber.
 *
 *   On envelope-decode failure (AC-13 analogue): no `room:restored`.
 *   Lock is still force-released so observers don't deadlock waiting
 *   on the submitter's input.
 */

import type { FastifyInstance } from 'fastify';

import { authMiddleware } from './auth-middleware';
import { decodeEnvelope } from '../engine';
import type { StorageAdapter } from '../storage/adapter';
import type { Identity, NamedSave } from '../storage/types';
import {
  getActiveLockRegistry,
  getActiveSubscriptionRegistry,
} from './ws';
import type { OutboundMessage } from './ws/types';

export interface RestoreRouteOptions {
  adapter: StorageAdapter;
}

interface RestoreRequestBody {
  saveId?: unknown;
}

function parseRestoreBody(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const { saveId } = body as RestoreRequestBody;
  if (typeof saveId !== 'string') return null;
  if (saveId.trim().length === 0) return null;
  return saveId;
}

export function registerRestoreRoute(
  app: FastifyInstance,
  options: RestoreRouteOptions,
): void {
  const auth = authMiddleware({ adapter: options.adapter });

  app.post(
    '/rooms/:id/restore',
    { preHandler: auth },
    async (request, reply) => {
      const { id: roomId } = request.params as { id: string };
      const saveId = parseRestoreBody(request.body);
      if (saveId === null) {
        return reply
          .code(400)
          .send({ error: 'invalid_body', detail: 'malformed_restore' });
      }
      const submitter = request.identity!;

      const room = await options.adapter.getRoom(roomId);
      if (!room) {
        return reply.code(404).send({ error: 'room_not_found' });
      }

      const save = await options.adapter.getNamedSave(saveId);
      if (!save) {
        return reply.code(404).send({ error: 'save_not_found' });
      }
      if (save.roomId !== roomId) {
        // Save exists but belongs to a different room — refusing
        // rather than allowing cross-room state injection.
        return reply.code(409).send({ error: 'save_room_mismatch' });
      }

      const lease = await options.adapter.acquireRoomLease(roomId);
      try {
        const target = await options.adapter.getSaveBlobAt(
          roomId,
          save.atTurn,
        );
        if (!target) {
          // Server-state inconsistency — the named save points at a
          // turn whose blob is gone. Phase 4b's create-time
          // validation should make this unreachable; defensive log
          // here matches the `bundle_not_installed` pattern in
          // `command.ts`.
          request.log.error(
            { roomId, saveId, atTurn: save.atTurn },
            'restore: target save_blob missing',
          );
          fanOutLockReleaseOnly(roomId);
          return reply.code(500).send({ error: 'restore_failed' });
        }

        // Validate the target is decodable BEFORE truncating forward
        // history. A corrupt envelope means the room has no
        // recoverable state at this turn — better to bail than
        // delete the future and leave the room unloadable.
        try {
          decodeEnvelope(target.payload);
        } catch (err) {
          request.log.error(
            { err, roomId, saveId },
            'restore: target envelope failed to decode',
          );
          fanOutLockReleaseOnly(roomId);
          return reply.code(500).send({ error: 'restore_failed' });
        }

        await options.adapter.truncateRoomHistory({
          roomId,
          keepThroughTurn: save.atTurn,
        });

        // Success — fan out and respond. Submitter's HTTP response
        // is the source of truth; their WS sees `room:restored` only
        // via the lock-state release.
        fanOutRestore(roomId, save, submitter);

        return reply.code(200).send({
          turn: save.atTurn,
          blocks: [],
          events: [],
        });
      } finally {
        await lease.release();
      }
    },
  );
}

// ── WebSocket fan-out (mirrors command.ts) ───────────────────────

function fanOutRestore(
  roomId: string,
  save: NamedSave,
  submitter: Identity,
): void {
  const subscriptions = getActiveSubscriptionRegistry();
  if (!subscriptions) {
    fanOutLockReleaseOnly(roomId);
    return;
  }

  for (const conn of subscriptions.subscribersOf(roomId)) {
    if (conn.identity.id === submitter.id) continue;
    const msg: OutboundMessage = {
      type: 'room:restored',
      roomId,
      atTurn: save.atTurn,
      by: { identityId: submitter.id, handle: submitter.handle },
      savedLabel: save.label,
    };
    conn.send(msg);
  }

  fanOutLockReleaseOnly(roomId);
}

function fanOutLockReleaseOnly(roomId: string): void {
  const subscriptions = getActiveSubscriptionRegistry();
  const locks = getActiveLockRegistry();
  if (!subscriptions || !locks) return;
  const previous = locks.forceRelease(roomId);
  if (!previous) return;
  for (const conn of subscriptions.subscribersOf(roomId)) {
    conn.send({ type: 'lock:state', roomId, holder: null });
  }
}
