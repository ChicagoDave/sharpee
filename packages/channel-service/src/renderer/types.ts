/**
 * @sharpee/channel-service/renderer — consumer-side type contracts.
 *
 * Owner context: consumer side of channel-I/O. Defines the
 * `ChannelRenderer` plug-in shape, the `Renderer` host that drives
 * packets into renderers, and the small `SlotHandle` abstraction the
 * default layouts use to address output regions.
 *
 * Public interface (per ADR-165 §1, §2, §5, §7):
 *  - `ChannelRenderer` — per-channel rendering contract; only
 *    `onValue` is required.
 *  - `Renderer` — top-level host the consumer drives.
 *  - `ChannelStateStore` — in-memory state per channel id (replace
 *    keeps latest, append accumulates, event has no entry).
 *  - `SlotHandle` — opaque handle the default layouts use; concrete
 *    consumers narrow to `HTMLElement` (DOM), terminal region (CLI),
 *    or whatever their output medium uses.
 *
 * No implementation lives here. Pure types so renderer-host packages
 * (browser, CLI, multi-user) and channel-renderer authors share a
 * single contract.
 *
 * @see ADR-165 — Renderer Architecture
 */

import type {
  ChannelDefinition,
  CmgtPacket,
  CommandPacket,
  TurnPacket,
} from '@sharpee/if-domain';

/**
 * Per-channel rendering logic (ADR-165 §1).
 *
 * A `ChannelRenderer` is registered against a channel id via
 * `Renderer.registerRenderer(channelId, renderer)`. The dispatcher
 * invokes `onValue` once per emission of that channel in a turn
 * packet; optional hooks fire on lifecycle transitions.
 *
 * The interface is deliberately small. Cross-channel logic (a
 * status-bar renderer reading both `location` and `score`) lives in
 * the host module, not inside individual `ChannelRenderer` instances.
 */
export interface ChannelRenderer {
  /**
   * Required. Called once per emission of this channel in a turn
   * packet. The shape of `value` mirrors the channel's mode:
   *
   *  - **replace-mode** — the latest scalar value (or `null` for
   *    hide / stop signals per ADR-163 §6).
   *  - **append-mode** — an array of new entries this turn (per
   *    ADR-163 §5; the renderer accumulates across turns).
   *  - **event-mode** — the event payload.
   *
   * `channel` is the manifest entry — useful for renderers that
   * decide formatting based on `contentType`.
   */
  onValue(value: unknown, channel: ChannelDefinition): void;

  /**
   * Optional. Append-mode only. Invoked by the dispatcher when a
   * `clear` event with a matching `target` arrives. The renderer
   * is responsible for clearing its rendered output (DOM container,
   * terminal region). The state store is reset by the dispatcher
   * before this hook fires.
   */
  onClear?(target: string): void;

  /**
   * Optional. Invoked when CMGT is applied. Use for one-time setup
   * (DOM scaffolding, asset preload, audio context init). NOT for
   * state restoration — that comes via `applyTurnPacket` replays.
   *
   * On the first `applyCmgt` of a `Renderer`'s lifetime this is the
   * only setup hook called. On subsequent invocations, `onDestroy`
   * is called first, then `onCmgt` is called again to set up a
   * fresh session.
   */
  onCmgt?(channel: ChannelDefinition, manifest: CmgtPacket): void;

  /**
   * Optional. Invoked when a fresh `applyCmgt` is about to reset
   * this `Renderer`. Releases resources allocated in `onCmgt` (Web
   * Audio context, IntersectionObserver, etc.). Symmetric with
   * `onCmgt`. Not called when the host platform itself is shutting
   * down (process exit, page unload) — the platform handles that.
   */
  onDestroy?(): void;
}

/**
 * Channel state store shape (ADR-165 §5).
 *
 * Replace channels store the latest scalar (or `null`); append
 * channels store an accumulated `unknown[]`; event channels and
 * never-emitted channels have no entry.
 *
 * The dispatcher owns mutation. Renderers read; they do not write.
 */
export interface ChannelStateStore {
  [channelId: string]: unknown | unknown[] | undefined;
}

/**
 * Opaque handle to a layout slot (ADR-165 §7).
 *
 * Concrete renderer hosts narrow to their output medium:
 *  - browser: `HTMLElement`
 *  - CLI: a small `{ write, clear }` adapter
 *  - canvas: a draw-group reference
 *
 * The `Renderer` itself is medium-agnostic — it stores and returns
 * whatever the host registers.
 */
export type SlotHandle = unknown;

/**
 * Top-level renderer handle the consumer drives (ADR-165 §2).
 *
 * One instance per session. The consumer:
 *  1. Constructs a `Renderer`.
 *  2. Calls `registerRenderer(channelId, renderer)` for each
 *     channel it wants to display (platform defaults register
 *     during platform boot; stories register during story init).
 *  3. Calls `applyCmgt(cmgt)` once when the engine emits the
 *     manifest.
 *  4. Calls `applyTurnPacket(packet)` per turn the engine emits.
 *  5. Subscribes to `onCommand(handler)` to feed commands back.
 */
export interface Renderer {
  /**
   * Apply a CMGT packet (ADR-165 §4).
   *
   * On second-and-subsequent invocations:
   *   1. Runs `onDestroy` for every renderer in the prior manifest.
   *   2. Resets every channel state store.
   *   3. Updates the current manifest.
   *   4. Runs `onCmgt` for every renderer in the new manifest, in
   *      manifest order.
   *
   * On the first invocation, step 1 is skipped.
   */
  applyCmgt(packet: CmgtPacket): void;

  /**
   * Dispatch a turn packet (ADR-165 §4). Iterates the current
   * manifest in registration order; for each manifest entry that
   * has a payload value, updates the state store and invokes the
   * registered renderer's `onValue`. `clear` events trigger the
   * append-channel truncation path.
   *
   * Synchronous: every dispatched callback completes before the
   * call returns.
   */
  applyTurnPacket(packet: TurnPacket): void;

  /**
   * Register a `ChannelRenderer` against a channel id. Last-write-
   * wins per ADR-165 §3 — re-registering with the same id replaces
   * the prior renderer. Platform-default renderers register first;
   * story overrides replace them.
   */
  registerRenderer(channelId: string, renderer: ChannelRenderer): void;

  /**
   * Register a renderer FACTORY for a channel-id prefix (ADR-241 D4).
   * When a manifest channel has no exact-id renderer, the longest
   * matching registered prefix builds one lazily (cached per id, per
   * manifest). The empty prefix `''` matches every channel — the
   * consumer's generic default. Exact-id registrations always win;
   * the JSON-tree fallback remains the last resort when no factory
   * matches.
   */
  registerRendererFactory(prefix: string, factory: (channelId: string) => ChannelRenderer): void;

  /**
   * Subscribe to `CommandPacket`s emitted by channel renderers.
   * The consumer's host loop pumps these back to the engine.
   * Multiple subscribers all receive each emission.
   */
  onCommand(handler: (cmd: CommandPacket) => void): void;

  /**
   * Emit a `CommandPacket`. Channel renderers call this when a UI
   * gesture (hotspot click, drag-drop, custom widget) should
   * advance the engine (ADR-163 §10).
   */
  emitCommand(text: string): void;

  /**
   * Register a slot (ADR-165 §7). Stories that replace the
   * platform-default layout call this for each region of their
   * custom layout.
   */
  registerSlot(name: string, handle: SlotHandle): void;

  /**
   * Resolve a slot handle, or `null` if the slot is not registered.
   */
  getSlot(name: string): SlotHandle | null;

  /**
   * Snapshot of the channel state store for testing and AC-7
   * (re-emission identity round-trip). Returns a deep-cloned copy;
   * the caller may mutate freely.
   */
  getStateSnapshot(): ChannelStateStore;
}
