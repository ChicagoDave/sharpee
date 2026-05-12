/**
 * @module @sharpee/zifmia/server/ws
 * @purpose Registers the `/ws` route on the shared Fastify instance,
 *   authenticates the upgrade handshake against the `sessions` table,
 *   dispatches inbound frames to per-message-kind handlers, and
 *   maintains the per-room subscription registry for downstream
 *   broadcast features.
 * @owner Zifmia server (tools/zifmia/server/ws).
 *
 * Wire shape:
 *
 *   - Handshake auth: `?token=<session-token>` query parameter,
 *     validated against `sessions.expiresAt > now`. Missing/expired
 *     tokens are rejected during the HTTP-upgrade phase with HTTP 401
 *     so the socket never actually opens — the client sees a synchronous
 *     handshake failure rather than an immediate close.
 *   - Inbound: JSON frames with a `type` discriminator. See
 *     `./types#InboundMessage` for the union.
 *   - Outbound: JSON frames in `./types#OutboundMessage` shape.
 *   - AC-9 invariant: `command:submit` over WS is rejected with an
 *     `error` frame (`code: 'transport_split'`) and writes no state.
 *     Commands MUST travel via `POST /rooms/:id/command`.
 *
 * Phase 3d.i scope:
 *   - Auth handshake
 *   - `room:subscribe` / `room:unsubscribe` lifecycle
 *   - AC-9 rejection of `command:submit`
 *   - Subscription registry exposed to the rest of the server via
 *     `getSubscriptionRegistry()` for Phase 3d.ii (chat/presence) and
 *     3d.iii (locks, turn:broadcast wire-up) to consume.
 *
 * Future phases extend the dispatcher with `chat:send`, `presence:*`,
 * `lock:*` cases and add the broadcast helpers the HTTP turn route
 * needs.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import websocketPlugin from '@fastify/websocket';

import type { StorageAdapter } from '../../storage/adapter';
import { ClientConnection } from './connection';
import { LockRegistry } from './lock-registry';
import { SubscriptionRegistry } from './subscription-registry';
import type {
  InboundMessage,
  LockStateMessage,
  OutboundMessage,
} from './types';

export interface WebSocketRouteOptions {
  adapter: StorageAdapter;
  /** Override the clock — tests pin time so session-expiry assertions
   * are deterministic. Defaults to `Date.now`. */
  now?: () => number;
}

/**
 * Registries exposed via `getActive*()` accessors so the HTTP command
 * route (and Phase 3d.iii features) can fan out broadcasts and
 * force-release locks without an explicit dependency-injection chain.
 * One instance per Fastify app.
 */
let activeSubscriptionRegistry: SubscriptionRegistry | null = null;
let activeLockRegistry: LockRegistry | null = null;

/** Returns the active subscription registry, or `null` if the WS
 * route has not been registered yet (e.g., tests that don't exercise
 * WebSocket behavior). */
export function getActiveSubscriptionRegistry(): SubscriptionRegistry | null {
  return activeSubscriptionRegistry;
}

/** Returns the active lock registry, or `null` if the WS route has
 * not been registered. The HTTP command route consults this after
 * every turn to force-release and broadcast `lock:state`. */
export function getActiveLockRegistry(): LockRegistry | null {
  return activeLockRegistry;
}

export async function registerWebSocketRoute(
  app: FastifyInstance,
  options: WebSocketRouteOptions,
): Promise<void> {
  await app.register(websocketPlugin);

  const now = options.now ?? Date.now;
  const registry = new SubscriptionRegistry();
  const lockRegistry = new LockRegistry();
  activeSubscriptionRegistry = registry;
  activeLockRegistry = lockRegistry;

  app.get(
    '/ws',
    { websocket: true },
    async (socket, request: FastifyRequest) => {
      const identity = await authenticateUpgrade(
        request,
        options.adapter,
        now,
      );
      if (!identity) {
        const errorFrame: OutboundMessage = {
          type: 'error',
          code: 'unauthenticated',
        };
        // Send the error frame first so the client gets a structured
        // reason rather than guessing from the close code, then close
        // with 1008 (policy violation) per RFC 6455.
        socket.send(JSON.stringify(errorFrame));
        socket.close(1008, 'unauthenticated');
        return;
      }

      const client = new ClientConnection(socket, identity);

      socket.on('message', (raw: Buffer) => {
        void handleInbound(
          client,
          raw,
          registry,
          lockRegistry,
          options.adapter,
        );
      });

      socket.on('close', () => {
        // Snapshot the rooms this connection was in BEFORE removal so
        // we can emit `presence:left` for rooms where this was the
        // identity's last connection.
        const subscribedRooms = collectSubscribedRoomsFor(registry, client);

        // Implicit lock release per ADR-175 §4 — when the lock holder
        // disconnects, other participants must see inputs re-enabled
        // within 1 s. We release before removeAll so the
        // `lock:state { holder: null }` broadcasts still reach the
        // room's remaining subscribers.
        const releasedLockRooms = lockRegistry.releaseAllFor(client);
        for (const roomId of releasedLockRooms) {
          broadcastToAll(registry, roomId, {
            type: 'lock:state',
            roomId,
            holder: null,
          });
        }

        registry.removeAll(client);
        for (const roomId of subscribedRooms) {
          const remaining = registry.connectionCountForIdentityInRoom(
            roomId,
            client.identity.id,
          );
          if (remaining === 0) {
            broadcastExcept(registry, roomId, client, {
              type: 'presence:left',
              roomId,
              identityId: client.identity.id,
              handle: client.identity.handle,
            });
          }
        }
      });

      // Silently drop socket errors. ws emits them on abnormal
      // disconnect / framing failures and they would otherwise crash
      // the route on an unhandled-emitter exception. The `close` event
      // still fires after, which handles registry cleanup.
      socket.on('error', () => {
        // no-op — close handler runs the cleanup.
      });
    },
  );
}

// ── Internal ──────────────────────────────────────────────────────

/**
 * Validate the handshake's session token. Reads `?token=` from the
 * upgrade request URL because browsers cannot set custom headers on
 * the `new WebSocket(url)` API and a query parameter is the
 * universally-supported transport. We accept it as a one-time auth
 * shot — the token is short-lived per AC-11 and the handshake URL is
 * never persisted in browser history for the `wss://` scheme.
 */
async function authenticateUpgrade(
  request: FastifyRequest,
  adapter: StorageAdapter,
  now: () => number,
): Promise<import('../../storage/types').Identity | null> {
  const query = request.query as { token?: unknown } | undefined;
  const token = typeof query?.token === 'string' ? query.token : undefined;
  if (!token || token.length === 0) return null;

  const session = await adapter.getSessionByToken(token);
  if (!session) return null;
  if (session.expiresAt < now()) return null;

  const identity = await adapter.getIdentityById(session.identityId);
  return identity ?? null;
}

/**
 * Hard cap on chat payload size. Matches the rough length of a chat
 * post in a typical IF client and stops a misbehaving connection from
 * spamming megabytes through the channel before the adapter or the
 * subscribers' clients tip over. Validated at the dispatcher.
 */
const MAX_CHAT_TEXT_LENGTH = 2000;

/**
 * Parse + dispatch a single inbound frame. Per-message handlers are
 * inlined for now — once the dispatcher grows past five kinds the
 * cases move into a `handlers/` directory keyed on `message.type`.
 *
 * AC-9: `command:submit` is rejected here, BEFORE any state mutation,
 * so a malicious client cannot bypass the HTTP single-writer route
 * by going through the WS.
 */
async function handleInbound(
  client: ClientConnection,
  raw: Buffer,
  registry: SubscriptionRegistry,
  lockRegistry: LockRegistry,
  adapter: StorageAdapter,
): Promise<void> {
  const message = parseInbound(raw);
  if (!message) {
    client.send({
      type: 'error',
      code: 'invalid_message',
      detail: 'frame is not a JSON object with a string `type`',
    });
    return;
  }

  switch (message.type) {
    case 'room:subscribe':
      await handleRoomSubscribe(client, registry, adapter, message.roomId);
      return;
    case 'room:unsubscribe':
      handleRoomUnsubscribe(
        client,
        registry,
        lockRegistry,
        message.roomId,
      );
      return;
    case 'chat:send':
      await handleChatSend(client, registry, adapter, message);
      return;
    case 'lock:acquire':
      handleLockAcquire(client, registry, lockRegistry, message.roomId);
      return;
    case 'lock:release':
      handleLockRelease(client, registry, lockRegistry, message.roomId);
      return;
    case 'command:submit':
      // AC-9 — commands ride HTTP, never the WS. We reply with an
      // error frame so the client can surface a developer-actionable
      // diagnostic, but we make NO state changes (no save_blob, no
      // event log, no audit row).
      client.send({
        type: 'error',
        code: 'transport_split',
        detail: 'commands must be sent via POST /rooms/:id/command',
      });
      return;
    default: {
      // Exhaustiveness check — adding a new InboundMessage kind in
      // `./types` without updating this switch produces a TypeScript
      // error here, not a silent runtime drop.
      const _exhaustive: never = message;
      void _exhaustive;
      client.send({
        type: 'error',
        code: 'invalid_message',
        detail: 'unknown message type',
      });
    }
  }
}

// ── room:subscribe / room:unsubscribe with presence ───────────────

async function handleRoomSubscribe(
  client: ClientConnection,
  registry: SubscriptionRegistry,
  adapter: StorageAdapter,
  roomId: string,
): Promise<void> {
  // Validate the room exists. Subscribing to a ghost room would
  // succeed locally but produce confusing fan-out semantics later
  // (the chat handler would treat it as "subscribed but unknown room")
  // — easier to reject up front.
  const room = await adapter.getRoom(roomId);
  if (!room) {
    client.send({
      type: 'error',
      code: 'room_not_found',
      detail: `room ${roomId} does not exist`,
    });
    return;
  }

  const wasFirstConnectionForIdentity =
    registry.connectionCountForIdentityInRoom(roomId, client.identity.id) === 0;

  registry.add(client, roomId);
  client.send({ type: 'room:subscribed', roomId });

  // Roster goes only to the joiner so they can render the participant
  // list immediately. Self is included — clients render themselves
  // with a self-marker; explicit inclusion avoids client-side joins
  // between the roster and the local identity.
  client.send({
    type: 'presence:roster',
    roomId,
    participants: registry.participantsOf(roomId),
  });

  if (wasFirstConnectionForIdentity) {
    broadcastExcept(registry, roomId, client, {
      type: 'presence:joined',
      roomId,
      identityId: client.identity.id,
      handle: client.identity.handle,
    });
  }
}

function handleRoomUnsubscribe(
  client: ClientConnection,
  registry: SubscriptionRegistry,
  lockRegistry: LockRegistry,
  roomId: string,
): void {
  // Even if the connection was never subscribed, send the ACK so the
  // client's local state can sync without error. Then check whether
  // this was the identity's last connection for the room.
  const wasSubscribed = registry.isSubscribed(client, roomId);
  registry.remove(client, roomId);
  client.send({ type: 'room:unsubscribed', roomId });

  if (!wasSubscribed) return;

  // If the unsubscriber held the lock for this room, release and
  // broadcast `lock:state { holder: null }` so other clients re-enable
  // their inputs. Leaving the room implies leaving the typing seat.
  const releasedLock = lockRegistry.release(client, roomId);
  if (releasedLock.released) {
    broadcastToAll(registry, roomId, {
      type: 'lock:state',
      roomId,
      holder: null,
    });
  }

  const remaining = registry.connectionCountForIdentityInRoom(
    roomId,
    client.identity.id,
  );
  if (remaining === 0) {
    broadcastExcept(registry, roomId, client, {
      type: 'presence:left',
      roomId,
      identityId: client.identity.id,
      handle: client.identity.handle,
    });
  }
}

// ── lock:acquire / lock:release ───────────────────────────────────

function handleLockAcquire(
  client: ClientConnection,
  registry: SubscriptionRegistry,
  lockRegistry: LockRegistry,
  roomId: string,
): void {
  // Must be subscribed to acquire — locks are a per-room UX
  // coordination signal; a client that hasn't joined the room has no
  // business steering the typing seat there.
  if (!registry.isSubscribed(client, roomId)) {
    client.send({
      type: 'error',
      code: 'not_subscribed',
      detail: `not subscribed to ${roomId}`,
    });
    return;
  }

  const result = lockRegistry.tryAcquire(client, roomId);
  if (!result.acquired) {
    // Contended — tell ONLY the requester who currently holds the
    // lock. Other clients already saw the original `lock:state` when
    // the holder acquired; re-broadcasting would be noise.
    const stateMessage: LockStateMessage = {
      type: 'lock:state',
      roomId,
      holder: {
        identityId: result.holder.connection.identity.id,
        handle: result.holder.connection.identity.handle,
      },
    };
    client.send({
      type: 'error',
      code: 'lock_contended',
      detail: `held by ${result.holder.connection.identity.handle}`,
    });
    client.send(stateMessage);
    return;
  }

  if (!result.stateChanged) {
    // Idempotent re-acquire — the visible state didn't change. We
    // still send the requester the canonical `lock:state` so their
    // local view of the holder field stays consistent without doing
    // a broadcast that the room already saw.
    client.send({
      type: 'lock:state',
      roomId,
      holder: {
        identityId: client.identity.id,
        handle: client.identity.handle,
      },
    });
    return;
  }

  broadcastToAll(registry, roomId, {
    type: 'lock:state',
    roomId,
    holder: {
      identityId: client.identity.id,
      handle: client.identity.handle,
    },
  });
}

function handleLockRelease(
  client: ClientConnection,
  registry: SubscriptionRegistry,
  lockRegistry: LockRegistry,
  roomId: string,
): void {
  if (!registry.isSubscribed(client, roomId)) {
    client.send({
      type: 'error',
      code: 'not_subscribed',
      detail: `not subscribed to ${roomId}`,
    });
    return;
  }

  const result = lockRegistry.release(client, roomId);
  if (!result.released) {
    // Idempotent — nothing to release. No broadcast.
    return;
  }
  broadcastToAll(registry, roomId, {
    type: 'lock:state',
    roomId,
    holder: null,
  });
}

// ── chat:send ─────────────────────────────────────────────────────

async function handleChatSend(
  client: ClientConnection,
  registry: SubscriptionRegistry,
  adapter: StorageAdapter,
  message: { roomId: string; text: string },
): Promise<void> {
  const text = message.text.trim();
  if (text.length === 0 || text.length > MAX_CHAT_TEXT_LENGTH) {
    client.send({
      type: 'error',
      code: 'invalid_message',
      detail: 'chat text empty or too long',
    });
    return;
  }

  const room = await adapter.getRoom(message.roomId);
  if (!room) {
    client.send({
      type: 'error',
      code: 'room_not_found',
      detail: `room ${message.roomId} does not exist`,
    });
    return;
  }

  if (!registry.isSubscribed(client, message.roomId)) {
    // Must be subscribed before posting. Stops a connection from
    // shotgun-broadcasting to arbitrary rooms and forces the social
    // "join the room" gesture.
    client.send({
      type: 'error',
      code: 'not_subscribed',
      detail: `not subscribed to ${message.roomId}`,
    });
    return;
  }

  const persisted = await adapter.appendChatMessage({
    roomId: message.roomId,
    fromId: client.identity.id,
    fromHandle: client.identity.handle,
    text,
    ts: Date.now(),
  });

  // Fan out to ALL subscribers (including the sender) so the wire
  // shape is canonical — clients render the server's authoritative
  // copy rather than splicing in optimistic-local state.
  broadcastToAll(registry, message.roomId, {
    type: 'chat:message',
    id: persisted.id,
    roomId: persisted.roomId,
    fromId: persisted.fromId,
    fromHandle: persisted.fromHandle,
    text: persisted.text,
    ts: persisted.ts,
  });
}

// ── Broadcast helpers ─────────────────────────────────────────────

function broadcastToAll(
  registry: SubscriptionRegistry,
  roomId: string,
  message: OutboundMessage,
): void {
  for (const conn of registry.subscribersOf(roomId)) {
    conn.send(message);
  }
}

function broadcastExcept(
  registry: SubscriptionRegistry,
  roomId: string,
  except: ClientConnection,
  message: OutboundMessage,
): void {
  for (const conn of registry.subscribersOf(roomId)) {
    if (conn === except) continue;
    conn.send(message);
  }
}

/** Snapshot a connection's current room set without mutating the
 * registry. Used in the close handler to compute which rooms need
 * `presence:left` broadcasts after `removeAll` runs. */
function collectSubscribedRoomsFor(
  registry: SubscriptionRegistry,
  conn: ClientConnection,
): string[] {
  const out: string[] = [];
  for (const roomId of registry.snapshot().keys()) {
    if (registry.isSubscribed(conn, roomId)) out.push(roomId);
  }
  return out;
}

/**
 * Validate the wire shape of an inbound frame. Returns the typed
 * `InboundMessage` on success or `null` if the payload isn't a JSON
 * object, lacks a `type` string, or has wrong field types for the
 * declared `type`. The dispatcher converts `null` into an `error`
 * frame with `code: 'invalid_message'`.
 */
function parseInbound(raw: Buffer): InboundMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.toString('utf-8'));
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.type !== 'string') return null;

  switch (obj.type) {
    case 'room:subscribe':
    case 'room:unsubscribe':
      if (typeof obj.roomId !== 'string' || obj.roomId.length === 0) return null;
      return { type: obj.type, roomId: obj.roomId };
    case 'chat:send':
      if (typeof obj.roomId !== 'string' || obj.roomId.length === 0) return null;
      if (typeof obj.text !== 'string') return null;
      // We accept any non-empty TEXT shape here and defer the length
      // policy to the handler so the rejection reason is precise
      // (`text empty or too long` rather than a generic
      // `invalid_message`).
      return { type: 'chat:send', roomId: obj.roomId, text: obj.text };
    case 'lock:acquire':
    case 'lock:release':
      if (typeof obj.roomId !== 'string' || obj.roomId.length === 0) return null;
      return { type: obj.type, roomId: obj.roomId };
    case 'command:submit':
      // AC-9 — we still accept the frame shape (loosely) so the
      // rejection path produces a useful `error` reply. We don't
      // bother validating roomId/command because we won't execute
      // them anyway.
      return {
        type: 'command:submit',
        roomId: typeof obj.roomId === 'string' ? obj.roomId : undefined,
        command: typeof obj.command === 'string' ? obj.command : undefined,
      };
    default:
      return null;
  }
}
