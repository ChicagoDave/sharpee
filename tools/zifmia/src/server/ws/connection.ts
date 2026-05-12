/**
 * @module @sharpee/zifmia/server/ws/connection
 * @purpose Server-side handle for a single connected WebSocket client.
 *   Wraps the raw `ws.WebSocket` with the per-connection identity, the
 *   set of subscriptions the connection holds, and a typed `send`
 *   helper that JSON-encodes outbound frames.
 * @owner Zifmia server (tools/zifmia/server/ws).
 *
 * One `ClientConnection` instance per accepted socket. Lifetime is
 * exactly the socket's open lifetime — the route's `close` handler
 * releases the connection's subscriptions and the GC reclaims it.
 */

import type { WebSocket } from 'ws';

import type { Identity } from '../../storage/types';
import type { OutboundMessage } from './types';

export class ClientConnection {
  /**
   * @param socket  - The underlying `ws.WebSocket` exposed by
   *                  `@fastify/websocket`. The route accesses it
   *                  directly for `close` / `terminate`; other modules
   *                  must go through `send()`.
   * @param identity - Authenticated session identity. Populated during
   *                  the WebSocket upgrade handshake; never null on a
   *                  fully-established `ClientConnection`.
   */
  constructor(
    readonly socket: WebSocket,
    readonly identity: Identity,
  ) {}

  /**
   * Encode `message` as JSON and send it. Drops silently if the socket
   * has already been closed — fan-out callers iterate large subscriber
   * sets and shouldn't have to filter dead connections themselves; the
   * route's `close` handler already removes the connection from the
   * registry shortly after.
   */
  send(message: OutboundMessage): void {
    if (this.socket.readyState !== this.socket.OPEN) return;
    this.socket.send(JSON.stringify(message));
  }
}
