/**
 * @module @sharpee/zifmia/server/command
 * @purpose `POST /rooms/:id/command` — wraps the stateless turn
 *   executor in an auth-gated HTTP route. The route's job is to
 *   validate the body, dispatch to `executeTurnStatelessly`, and map
 *   precondition failures + engine throws to HTTP status codes.
 * @owner Zifmia server (tools/zifmia/server).
 *
 * Error mapping (ADR-175 §3c, §AC-13):
 *
 *   | Cause                                    | HTTP | Body shape                          |
 *   | ---------------------------------------- | ---- | ----------------------------------- |
 *   | Missing/expired/invalid session          | 401  | `{ error: 'unauthenticated' }`      |
 *   | Body missing `command` or wrong shape    | 400  | `{ error: 'invalid_body', detail }` |
 *   | Unknown `:id`                            | 404  | `{ error: 'room_not_found' }`       |
 *   | Room soft-closed                         | 410  | `{ error: 'room_closed' }`          |
 *   | Room references a missing bundle version | 500  | `{ error: 'bundle_not_installed' }` |
 *   | Engine throws during executeTurn         | 500  | `{ error: 'turn_failed' }`          |
 *   | Any other unexpected throw               | 500  | `{ error: 'turn_failed' }`          |
 *
 * Phase 3d will add the WS `lock:state {holder: null}` broadcast on
 * the engine-throw path; for 3c.ii the route only does the HTTP side.
 */

import type { FastifyInstance } from 'fastify';

import { authMiddleware } from './auth-middleware';
import {
  BundleNotInstalledError,
  RoomClosedError,
  RoomNotFoundError,
  executeTurnStatelessly,
} from '../engine';
import type { StorageAdapter } from '../storage/adapter';

export interface CommandRouteOptions {
  adapter: StorageAdapter;
}

interface CommandRequestBody {
  command?: unknown;
}

/** Cap command length to 1000 chars — the player input box never sends
 * more than a single line in practice, and the upper bound stops a
 * misbehaving client from feeding the parser an enormous string. */
const MAX_COMMAND_LENGTH = 1000;

function parseCommandBody(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const { command } = body as CommandRequestBody;
  if (typeof command !== 'string') return null;
  const trimmed = command.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_COMMAND_LENGTH) return null;
  return trimmed;
}

export function registerCommandRoute(
  app: FastifyInstance,
  options: CommandRouteOptions,
): void {
  const auth = authMiddleware({ adapter: options.adapter });

  app.post(
    '/rooms/:id/command',
    { preHandler: auth },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const command = parseCommandBody(request.body);
      if (command === null) {
        return reply
          .code(400)
          .send({ error: 'invalid_body', detail: 'malformed_command' });
      }

      try {
        const packet = await executeTurnStatelessly({
          adapter: options.adapter,
          roomId: id,
          command,
        });
        return reply.code(200).send(packet);
      } catch (err) {
        if (err instanceof RoomNotFoundError) {
          return reply.code(404).send({ error: err.code });
        }
        if (err instanceof RoomClosedError) {
          return reply.code(410).send({ error: err.code });
        }
        if (err instanceof BundleNotInstalledError) {
          // Server-state inconsistency — the room is pinned to a bundle
          // version that should still be in the library. Visible to
          // admins via logs; the player sees a generic 500.
          request.log.error(
            { err, roomId: id, storyId: err.storyId, version: err.version },
            'command: bundle_not_installed',
          );
          return reply.code(500).send({ error: 'bundle_not_installed' });
        }
        // Engine throw or any other unexpected error: AC-13 — no
        // save_blob was written (the executor never reached
        // appendSaveBlob), the lease is already released by the
        // executor's finally block, and the wire response is the
        // generic `turn_failed`.
        request.log.error({ err, roomId: id }, 'command: turn_failed');
        return reply.code(500).send({ error: 'turn_failed' });
      }
    },
  );
}
