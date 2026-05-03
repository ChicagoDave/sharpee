/**
 * @sharpee/channel-service/wire — client-side decoder
 *
 * Owner context: wire-protocol module. A small state machine the
 * consumer feeds incoming packets through. Enforces the ordering
 * invariants from ADR-163 §11 / AC-11:
 *
 *   1. The first server-bound packet a consumer accepts is `cmgt`.
 *   2. `turn` packets are accepted only after `cmgt`.
 *   3. `hello` and `command` are not server-bound — receiving one is a
 *      protocol error.
 *
 * The decoder does NOT render — it only validates ordering and exposes
 * the negotiated manifest. Renderer dispatch is the consumer's
 * concern (per ADR-165).
 *
 * @see ADR-163 §11 — bootstrap order invariants
 */

import type { CmgtPacket, TurnPacket, WirePacket } from '@sharpee/if-domain';

/**
 * State exposed by the decoder after each `ingest` call.
 *
 * - `'awaiting-cmgt'` — initial state. Consumer has dispatched a hello
 *   and is awaiting the server's CMGT manifest.
 * - `'live'` — CMGT received; turn packets are now accepted.
 * - `'error'` — protocol violation. The decoder does not recover; the
 *   consumer must drop the connection (or, in single-bundle, surface
 *   the error and reset the producer).
 */
export type DecoderState =
  | { readonly status: 'awaiting-cmgt' }
  | { readonly status: 'live'; readonly cmgt: CmgtPacket }
  | { readonly status: 'error'; readonly reason: string };

/**
 * Decoder handle. The consumer reads `state` after each `ingest`.
 * `lastTurn` is set when a turn is accepted and cleared when the
 * decoder transitions to `error`.
 */
export interface Decoder {
  readonly state: DecoderState;
  /**
   * Most recently accepted `turn` packet, or `null` if none has been
   * accepted in the current session. Reset on every `ingest`.
   */
  readonly lastTurn: TurnPacket | null;
  /**
   * Feed a packet to the decoder. After this returns, `state` reflects
   * the new state. Returns the same handle for chaining.
   */
  ingest(packet: WirePacket): Decoder;
}

class DecoderImpl implements Decoder {
  state: DecoderState = { status: 'awaiting-cmgt' };
  lastTurn: TurnPacket | null = null;

  ingest(packet: WirePacket): Decoder {
    if (this.state.status === 'error') {
      // Stay in error; protocol violations are unrecoverable.
      return this;
    }

    switch (packet.kind) {
      case 'cmgt': {
        if (this.state.status !== 'awaiting-cmgt') {
          this.state = {
            status: 'error',
            reason: 'cmgt received after session already live',
          };
          return this;
        }
        this.state = { status: 'live', cmgt: packet };
        return this;
      }
      case 'turn': {
        if (this.state.status !== 'live') {
          this.state = {
            status: 'error',
            reason:
              'turn received before cmgt — bootstrap order requires cmgt first (ADR-163 §11, AC-11d)',
          };
          this.lastTurn = null;
          return this;
        }
        this.lastTurn = packet;
        return this;
      }
      case 'hello':
      case 'command': {
        // Both are client→server. Receiving one as a server→client
        // packet is a protocol violation regardless of state.
        this.state = {
          status: 'error',
          reason: `unexpected client→server packet '${packet.kind}' on server→client stream`,
        };
        this.lastTurn = null;
        return this;
      }
    }
  }
}

/**
 * Create a fresh client-side decoder in the `awaiting-cmgt` state.
 */
export function createDecoder(): Decoder {
  return new DecoderImpl();
}
