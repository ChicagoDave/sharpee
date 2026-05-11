/**
 * @module @sharpee/zifmia/engine/types
 * @purpose Wire shapes returned by the stateless turn executor and shared
 *   between the executor, the `POST /rooms/:id/command` route, and the
 *   forthcoming WebSocket turn:broadcast publisher.
 * @owner Zifmia server — turn-lifecycle integration (ADR-175 §3c).
 */

import type { ITextBlock } from '@sharpee/text-blocks';

/**
 * Forwarded subset of the engine's semantic events. Only the type and the
 * raw data payload survive — the in-process `entities` record and the
 * id/timestamp fields are dropped to keep the wire shape stable across
 * adapters and to avoid leaking engine internals to clients.
 */
export interface TurnEvent {
  type: string;
  data: Record<string, unknown>;
}

/**
 * Result of executing exactly one turn for a room. The route layer
 * serializes this directly into the HTTP response body and the WS
 * `turn:broadcast` packet.
 */
export interface TurnPacket {
  /** Turn number that was just executed (== save_blob.turn). */
  turn: number;
  /** Text blocks emitted by the engine during this turn. */
  blocks: ITextBlock[];
  /** Forwardable events emitted during this turn. */
  events: TurnEvent[];
}
