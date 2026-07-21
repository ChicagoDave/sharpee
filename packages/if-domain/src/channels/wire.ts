/**
 * @sharpee/if-domain — channel wire-protocol types (ADR-163 §1, §11).
 *
 * Owner context: domain layer. Pure types describing the four packets
 * that cross the wire between server and client in the channel-I/O
 * system.
 *
 * Public interface (per CLAUDE.md rule 7b): single-user and multi-user
 * surfaces both import directly from this module. Co-located client and
 * server code shares the wire contract via direct import to make
 * protocol drift mechanically impossible.
 *
 * Constraint: NO runtime-specific types (no `Buffer`, `fs.Stats`,
 * `DOMException`, no DOM globals, no Node globals). The module must be
 * importable by browser, Node, and CLI contexts without dragging in a
 * runtime they don't have.
 *
 * @see ADR-163 — Channel-Service Platform — §1, §3, §4, §5, §11
 */

import type {
  ChannelContentType,
  ChannelEmitPolicy,
  ChannelMode,
  ClientCapabilities,
} from './types.js';

/**
 * Channel definition as it appears in a CMGT manifest (ADR-163 §11).
 *
 * Wire-shaped subset of `IOChannel` — just identity and configuration.
 * The producer closure does not cross the wire; only its outputs do.
 *
 * Mode lives on the channel, not on the rule (ADR-163 §4). A channel
 * always behaves the same way regardless of which `IOChannel` produced
 * it, and clients dispatch on the manifest entry alone.
 */
export interface ChannelDefinition {
  /** Channel id. String — no integer packing. */
  readonly id: string;
  /** Content type carried by emissions on this channel. */
  readonly contentType: ChannelContentType;
  /** Update mode (replace / append / event). */
  readonly mode: ChannelMode;
  /**
   * Emit policy. Optional in the wire shape because authors may omit
   * it on `IOChannel` registration; the platform standard channels
   * default to `'always'` and author channels default to `'sparse'`.
   */
  readonly emit?: ChannelEmitPolicy;
}

/**
 * Hello packet — client → server at session start (ADR-163 §1, §2).
 *
 * Single-user runtimes synthesize a hello internally. In transport-
 * attached deployments (ADR-164) the client transmits one over the wire.
 * Either way, the `ChannelService` may not emit `cmgt` until a hello
 * has been registered for the session (bootstrap-order invariant per
 * §11).
 */
export interface HelloPacket {
  readonly kind: 'hello';
  readonly capabilities: ClientCapabilities;
}

/**
 * CMGT (channel-management) packet — server → client (ADR-163 §1, §11).
 *
 * Pure schema; no values. The manifest is per-client — derived from the
 * union of registered channels filtered by the client's capability
 * declaration (per §6, §11).
 */
export interface CmgtPacket {
  readonly kind: 'cmgt';
  /**
   * Wire protocol version. Initial value `1`. Bumped on breaking shape
   * changes to packet kinds or `ChannelDefinition` fields. Additive
   * channels do not bump version.
   */
  readonly protocol_version: number;
  /**
   * Capability-filtered channel definitions for this client.
   */
  readonly channels: ReadonlyArray<ChannelDefinition>;
}

/**
 * Turn packet — server → client per turn (ADR-163 §1).
 *
 * The payload is a record keyed by channel id. Per-channel emit policy
 * (§5) governs which channel keys appear: `'always'` channels appear
 * every turn, `'sparse'` channels appear only on change.
 *
 * Append-mode payload values carry NEW ENTRIES THIS TURN ONLY, not the
 * accumulated list (§5). The renderer is responsible for accumulation.
 */
export interface TurnPacket {
  readonly kind: 'turn';
  /**
   * Turn identifier — opaque string. Used for re-emission identity
   * (§14) and for transcript ordering in downstream consumers.
   */
  readonly turn_id: string;
  /**
   * Channel-keyed payload. Channel ids map to type-specific values:
   * text channels carry strings, number channels carry numbers, json
   * channels carry arbitrary objects (or `null` for replace-mode
   * media channels signaling stop/hide per §7).
   */
  readonly payload: Readonly<Record<string, unknown>>;
}

/**
 * Command packet — client → server per input (ADR-163 §1, §9).
 *
 * UI gestures (hotspot click, drag-drop, custom widget) are synthesized
 * into command packets indistinguishable from typed input. The boundary
 * rule (§9): if the action would change what the engine sees on the
 * next turn, it is a `CommandPacket`; otherwise it is renderer-local
 * and never reaches the wire.
 */
export interface CommandPacket {
  readonly kind: 'command';
  readonly text: string;
}

/**
 * Wire packet discriminated union — every packet that crosses the wire.
 *
 * Decoders pattern-match on `kind` to dispatch.
 */
export type WirePacket =
  | HelloPacket
  | CmgtPacket
  | TurnPacket
  | CommandPacket;
