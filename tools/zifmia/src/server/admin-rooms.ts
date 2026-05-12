/**
 * @module @sharpee/zifmia/server/admin-rooms
 * @purpose `DELETE /admin/rooms/:id` — admin room-kill route. Soft-
 *   closes the room via `closeRoom` (idempotent) and emits a
 *   `room.kill` audit row.
 * @owner Zifmia server (tools/zifmia/server).
 *
 * Per ADR-175 §Resolved OQ-6 (2026-05-11): `room.kill` is a captured
 * audit action class. Soft-close preserves chat history, save_blobs,
 * and audit rows for post-incident review — only `rooms.closed_at`
 * is updated.
 *
 * Wire shape:
 *   - 204 on success (idempotent — re-killing an already-closed room
 *     is fine; the audit row records `wasAlreadyClosed: true`)
 *   - 404 `room_not_found` when no row exists for `:id`
 *   - 401 / 403 via the [auth, admin] preHandler chain
 */

import type { FastifyInstance } from 'fastify';

import { adminMiddleware } from './admin-middleware';
import { authMiddleware } from './auth-middleware';
import type { StorageAdapter } from '../storage/adapter';

export interface AdminRoomRoutesOptions {
  adapter: StorageAdapter;
}

export function registerAdminRoomRoutes(
  app: FastifyInstance,
  options: AdminRoomRoutesOptions,
): void {
  const auth = authMiddleware({ adapter: options.adapter });
  const admin = adminMiddleware();
  const preHandler = [auth, admin];

  app.delete(
    '/admin/rooms/:id',
    { preHandler },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const room = await options.adapter.getRoom(id);
      if (!room) {
        return reply.code(404).send({ error: 'room_not_found' });
      }

      const wasAlreadyClosed = room.closedAt !== undefined;
      await options.adapter.closeRoom(id);

      try {
        await options.adapter.appendAuditEntry({
          actorId: request.identity!.id,
          action: 'room.kill',
          targetKind: 'room',
          targetId: id,
          detail: JSON.stringify({
            roomId: id,
            title: room.title,
            wasAlreadyClosed,
          }),
        });
      } catch (auditErr) {
        request.log.error(
          { err: auditErr, roomId: id },
          'admin-rooms: audit_write_failed',
        );
      }

      return reply.code(204).send();
    },
  );
}
