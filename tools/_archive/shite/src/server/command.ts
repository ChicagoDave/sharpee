/**
 * @module @sharpee/zifmia/server/command
 * @purpose `POST /rooms/:id/command` — wraps the stateless turn
 *   executor in an auth-gated HTTP route. The route's job is to
 *   validate the body, dispatch to `executeTurnStatelessly`, and map
 *   precondition failures + engine throws to HTTP status codes. After
 *   the turn lands, the route fans out side-channel events to the
 *   WebSocket subscribers of the room.
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
 * WebSocket fan-out (Phase 3d.iii):
 *
 *   On success: `command_echo` then `turn:broadcast` to every
 *   subscriber EXCEPT the submitter's identity (the submitter has the
 *   TurnPacket as their HTTP response body, so echoing it back to
 *   their socket would duplicate). Lock is force-released and
 *   `lock:state { holder: null }` broadcast to every subscriber so
 *   inputs unlock for the room.
 *
 *   On engine throw (AC-13): no `turn:broadcast`, no `command_echo`.
 *   Lock is still force-released and `lock:state { holder: null }` is
 *   broadcast — otherwise observer clients would be stuck with their
 *   inputs read-only forever waiting for a release the server already
 *   processed.
 */

import type { FastifyInstance } from 'fastify';

import { authMiddleware } from './auth-middleware';
import {
  BundleNotInstalledError,
  RoomClosedError,
  RoomNotFoundError,
  executeTurnStatelessly,
} from '../engine';
import type { TurnPacket } from '../engine';
import type { StorageAdapter } from '../storage/adapter';
import type { Identity } from '../storage/types';
import type { WorkerPool } from './worker-pool';
import {
  getActiveLockRegistry,
  getActiveSubscriptionRegistry,
} from './ws';
import type { ClientConnection } from './ws/connection';
import type { OutboundMessage } from './ws/types';

export interface CommandRouteOptions {
  adapter: StorageAdapter;
  /**
   * Concurrency cap for `executeTurnStatelessly`. Required — the
   * server bootstrap is responsible for sizing this from
   * `ZIFMIA_WORKER_COUNT`. Phase 3e: every turn execution runs inside
   * `workerPool.run(...)`. Lease acquisition stays inside the slot so
   * a busy room never burns capacity for another room's turn.
   */
  workerPool: WorkerPool;
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
  const pool = options.workerPool;

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

      const submitter = request.identity!;

      try {
        const packet = await pool.run(() =>
          executeTurnStatelessly({
            adapter: options.adapter,
            roomId: id,
            command,
            submitter: {
              identityId: submitter.id,
              handle: submitter.handle,
            },
          }),
        );
        fanOutSuccess(id, command, packet, submitter);
        // Phase 5b — audit only on success per ADR-175 §Resolved OQ-6.
        // Engine-throw paths intentionally produce no audit row so a
        // failed turn doesn't leave a misleading entry behind.
        try {
          await options.adapter.appendAuditEntry({
            actorId: submitter.id,
            action: 'command.submit',
            targetKind: 'room',
            targetId: id,
            detail: JSON.stringify({
              roomId: id,
              turn: packet.turn,
              command,
              submitter: {
                identityId: submitter.id,
                handle: submitter.handle,
              },
            }),
          });
        } catch (auditErr) {
          // Audit write failed AFTER the turn already committed.
          // Failing the player here would be wrong — log loudly and
          // continue. An admin investigating later sees the absent
          // row in the audit log itself.
          request.log.error(
            { err: auditErr, roomId: id, turn: packet.turn },
            'command: audit_write_failed',
          );
        }
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
          // AC-13 — even for this server-internal failure, we still
          // unlock the room so other clients aren't stuck waiting.
          fanOutLockReleaseOnly(id);
          return reply.code(500).send({ error: 'bundle_not_installed' });
        }
        // Engine throw or any other unexpected error: AC-13 — no
        // save_blob was written (the executor never reached
        // appendSaveBlob), the lease is already released by the
        // executor's finally block. The wire response is the generic
        // `turn_failed`. We still force-release the lock and broadcast
        // `lock:state { holder: null }` so observer clients re-enable
        // their inputs.
        request.log.error({ err, roomId: id }, 'command: turn_failed');
        fanOutLockReleaseOnly(id);
        return reply.code(500).send({ error: 'turn_failed' });
      }
    },
  );
}

// ── WebSocket fan-out (3d.iii) ────────────────────────────────────

/**
 * Broadcast `command_echo` + `turn:broadcast` to every subscriber
 * whose identity is NOT the submitter, then force-release the lock
 * and broadcast `lock:state { holder: null }` to everyone (submitter
 * included, since the submitter's WS still needs to know the
 * room-wide state changed).
 */
function fanOutSuccess(
  roomId: string,
  command: string,
  packet: TurnPacket,
  submitter: Identity,
): void {
  const subscriptions = getActiveSubscriptionRegistry();
  if (!subscriptions) {
    // WebSocket route not registered — common in unit tests that
    // exercise only the HTTP layer. Nothing to fan out to.
    fanOutLockReleaseOnly(roomId);
    return;
  }

  const submitterInfo = {
    identityId: submitter.id,
    handle: submitter.handle,
  };

  // Echo first, then turn:broadcast. Order matters for observer
  // clients that render an in-progress "> look" hint before the
  // resulting block of text scrolls in.
  broadcastExceptIdentity(subscriptions, roomId, submitter.id, {
    type: 'command_echo',
    roomId,
    turn: packet.turn,
    submitter: submitterInfo,
    command,
  });
  broadcastExceptIdentity(subscriptions, roomId, submitter.id, {
    type: 'turn:broadcast',
    roomId,
    turn: packet.turn,
    blocks: packet.blocks,
    events: packet.events,
    channelPacket: packet.channelPacket,
    submitter: submitterInfo,
  });

  fanOutLockReleaseOnly(roomId);
}

/** Force-release the room lock and broadcast `lock:state { holder:
 * null }` to every subscriber. Idempotent — does nothing if no one
 * holds the lock. */
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

function broadcastExceptIdentity(
  registry: ReturnType<typeof getActiveSubscriptionRegistry>,
  roomId: string,
  excludeIdentityId: string,
  message: OutboundMessage,
): void {
  if (!registry) return;
  for (const conn of registry.subscribersOf(roomId)) {
    if (conn.identity.id === excludeIdentityId) continue;
    sendIfOpen(conn, message);
  }
}

function sendIfOpen(conn: ClientConnection, message: OutboundMessage): void {
  conn.send(message);
}
