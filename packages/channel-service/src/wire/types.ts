/**
 * @sharpee/channel-service — wire-protocol types
 *
 * Owner context: platform package. Imported by every Sharpee surface
 * (CLI, platform-browser, zifmia, multi-user server, multi-user client).
 *
 * Public interface (AC-2): the seven wire types declared here cross
 * trust boundaries — single-user and multi-user surfaces both import
 * directly from this module per CLAUDE.md rule 7b.
 *
 * Constraint: NO runtime-specific types (no `Buffer`, `fs.Stats`,
 * `DOMException`, no DOM globals, no Node globals). The module must be
 * importable by browser, Node, and CLI contexts without dragging in a
 * runtime they don't have.
 *
 * @see ADR-163 — Channel-Service Platform — decisions 1, 2, 3, 12
 */

/**
 * Channel content types (ADR-163 §3).
 *
 * - `text` — plain string. Renderer writes verbatim or styles.
 * - `number` — integer or float. Producer emits `42`; client formats.
 * - `json` — structured object. Escape hatch for author-defined surfaces
 *   and for the platform's `main` channel which carries `TextContent[]`.
 */
export type ChannelContentType = 'text' | 'number' | 'json';

/**
 * Channel update modes (ADR-163 §4).
 *
 * - `replace` — newest value supersedes prior values. Persistent: a
 *   mid-session join replays the latest value.
 * - `append` — value added to a chronological list (transcript-shaped).
 *   Persistent: a mid-session join replays the full list (subject to
 *   `clear` truncation per §10).
 * - `event` — transient signal; client renders once and discards. Not
 *   persisted; mid-session joins do not see prior `event` emissions.
 */
export type ChannelMode = 'replace' | 'append' | 'event';

/**
 * Per-channel emit policy (ADR-163 §5).
 *
 * - `always` — channel populated in every turn packet. `replace` emits
 *   current value (changed or not); `append` emits any new entries
 *   (possibly empty array); `event` is the natural exception (only
 *   emits on fire).
 * - `sparse` — channel appears only when its value changed (`replace`)
 *   or new entries were produced (`append`/`event`). Default.
 */
export type ChannelEmitPolicy = 'always' | 'sparse';

/**
 * Channel definition — sent to client in CMGT manifest (ADR-163 §12).
 *
 * Mode lives on the channel, not on the rule. A channel always behaves
 * the same way regardless of which rule routed a block to it.
 */
export interface ChannelDefinition {
  /**
   * Channel id. String — no integer packing (FyreVM had to; we have JSON).
   */
  readonly id: string;

  /**
   * Content type carried by emissions on this channel.
   */
  readonly contentType: ChannelContentType;

  /**
   * Update mode (replace / append / event).
   */
  readonly mode: ChannelMode;

  /**
   * Emit policy. Defaults to `'sparse'` for story channels;
   * `'always'` for the ten platform standard channels and replace-mode
   * media channels (per §5 and §7).
   */
  readonly emit?: ChannelEmitPolicy;
}

/**
 * Client capabilities declared at session start (ADR-163 §2).
 *
 * Fields preserve ADR-101's `ClientCapabilities` interface verbatim.
 *
 * The CMGT producer filters capability-gated channels (media channels
 * per §6) at emission time using these flags.
 */
export interface ClientCapabilities {
  // Display
  /** Always true — every Sharpee surface renders text. */
  readonly text: true;
  readonly images: boolean;
  readonly animations: boolean;
  readonly video: boolean;

  // Audio
  readonly sound: boolean;
  readonly music: boolean;
  readonly speech: boolean;

  // Layout
  readonly splitPane: boolean;
  readonly statusBar: boolean;
  readonly sidebar: boolean;

  // Input
  readonly clickableText: boolean;
  readonly clickableImage: boolean;
  readonly dragDrop: boolean;

  // Advanced
  readonly transitions: boolean;
  readonly layers: boolean;
  readonly customFonts: boolean;

  // Dimensions
  readonly screenWidth?: number;
  readonly screenHeight?: number;
}

/**
 * Hello packet — client → server at session start (ADR-163 §1, §2).
 *
 * Single-user runtimes synthesize a hello internally. In transport-
 * attached deployments (ADR-164) the client transmits one over the wire.
 * Either way, channel-service may not emit `cmgt` until a hello has been
 * registered for the session (bootstrap-order invariant per §11).
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
