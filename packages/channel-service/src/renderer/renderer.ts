/**
 * @sharpee/channel-service/renderer — `Renderer` host implementation.
 *
 * Owner context: consumer-side dispatcher. Drives `CmgtPacket` and
 * `TurnPacket` instances into registered `ChannelRenderer` plug-ins,
 * holds the channel state store, and pumps commands back to the
 * engine.
 *
 * Public interface (per ADR-165 §2, §3, §4, §5, §7):
 *  - `Renderer` class implementing the same-named interface.
 *  - `createRenderer(opts)` factory for ergonomic instantiation.
 *
 * @see ADR-165 — Renderer Architecture
 */

import type {
  ChannelDefinition,
  CmgtPacket,
  CommandPacket,
  TurnPacket,
} from '@sharpee/if-domain';
import type {
  ChannelRenderer,
  ChannelStateStore,
  Renderer as RendererInterface,
  SlotHandle,
} from './types';
import {
  createJsonTreeFallbackFactory,
  type FallbackOutputSink,
  type FallbackWarningSink,
} from './json-tree-fallback';

/**
 * Optional construction options for the `Renderer`.
 */
export interface RendererOptions {
  /**
   * Sink for warnings (unrendered channels, payload keys not in the
   * manifest). Defaults to `console.warn`.
   */
  warn?: (message: string) => void;
  /**
   * Sink for unhandled-channel JSON-tree output. Defaults to
   * `console.log` — concrete consumers redirect to their debug surface.
   */
  fallbackOutput?: FallbackOutputSink;
  /**
   * Override the warning sink the fallback uses. Defaults to
   * `opts.warn ?? console.warn`. Exposed as a separate option so
   * tests can record fallback warnings independently of dispatch
   * warnings.
   */
  fallbackWarn?: FallbackWarningSink;
}

/**
 * Concrete `Renderer` host (ADR-165 §2).
 *
 * One instance per session. Holds:
 *  - the registered `ChannelRenderer`s (last-write-wins per channel id),
 *  - the channel state store (replace-latest, append-accumulating,
 *    event-no-entry — ADR-165 §5),
 *  - the slot handles (`getSlot` / `registerSlot` per §7),
 *  - the current `CmgtPacket` (so `onValue` can pass the matching
 *    `ChannelDefinition` to the renderer),
 *  - the command-handler subscriber list.
 *
 * No DOM, no transport, no engine. Concrete consumers compose this
 * with their host platform.
 */
export class Renderer implements RendererInterface {
  private renderers = new Map<string, ChannelRenderer>();
  private fallbackRenderers = new Map<string, ChannelRenderer>();
  private state: ChannelStateStore = {};
  private slots = new Map<string, SlotHandle>();
  private commandHandlers = new Set<(cmd: CommandPacket) => void>();
  private currentManifest?: CmgtPacket;
  private readonly warn: (message: string) => void;
  private readonly buildFallback: (channelId: string) => ChannelRenderer;

  constructor(opts: RendererOptions = {}) {
    this.warn = opts.warn ?? ((m) => {
      // eslint-disable-next-line no-console
      console.warn(m);
    });
    this.buildFallback = createJsonTreeFallbackFactory({
      warn: opts.fallbackWarn ?? this.warn,
      output: opts.fallbackOutput,
    });
  }

  // ────────────────────────────────────────────────────────────────
  //  Registration
  // ────────────────────────────────────────────────────────────────

  /**
   * Register a `ChannelRenderer` (ADR-165 §3). Last-write-wins —
   * re-registering replaces the prior renderer for that id.
   */
  registerRenderer(channelId: string, renderer: ChannelRenderer): void {
    this.renderers.set(channelId, renderer);
  }

  /**
   * Register a slot (ADR-165 §7). Stories that replace the
   * platform-default layout call this for each region.
   */
  registerSlot(name: string, handle: SlotHandle): void {
    this.slots.set(name, handle);
  }

  /**
   * Resolve a slot handle, or `null` if not registered.
   */
  getSlot(name: string): SlotHandle | null {
    return this.slots.has(name) ? (this.slots.get(name) as SlotHandle) : null;
  }

  // ────────────────────────────────────────────────────────────────
  //  Command pump
  // ────────────────────────────────────────────────────────────────

  /**
   * Subscribe to commands emitted by channel renderers.
   */
  onCommand(handler: (cmd: CommandPacket) => void): void {
    this.commandHandlers.add(handler);
  }

  /**
   * Emit a command from a `ChannelRenderer` (UI-gesture origin).
   * All registered handlers receive the packet synchronously.
   */
  emitCommand(text: string): void {
    const packet: CommandPacket = { kind: 'command', text };
    for (const handler of this.commandHandlers) {
      handler(packet);
    }
  }

  // ────────────────────────────────────────────────────────────────
  //  Lifecycle
  // ────────────────────────────────────────────────────────────────

  /**
   * Apply a CMGT packet (ADR-165 §4 lifecycle).
   *
   *  1. If a prior manifest exists, run `onDestroy` for each of its
   *     renderers (in registration order for determinism).
   *  2. Reset the state store.
   *  3. Update the current manifest.
   *  4. Run `onCmgt` for each new-manifest renderer in registration
   *     order.
   */
  applyCmgt(packet: CmgtPacket): void {
    if (this.currentManifest) {
      for (const channel of this.currentManifest.channels) {
        const r = this.renderers.get(channel.id) ?? this.fallbackRenderers.get(channel.id);
        r?.onDestroy?.();
      }
    }

    this.state = {};
    this.currentManifest = packet;
    // Reset fallback cache so a re-mounted session re-issues the
    // one-time warning if a channel still lacks a renderer.
    this.fallbackRenderers.clear();

    for (const channel of packet.channels) {
      const r = this.resolveRenderer(channel.id);
      r.onCmgt?.(channel, packet);
    }
  }

  /**
   * Dispatch a turn packet (ADR-165 §4 dispatch contract).
   *
   * Iterates the current manifest in registration order. For each
   * manifest entry that has a payload value, updates the state
   * store per mode and invokes `onValue`. Handles the `clear`
   * channel specially — empties append-mode state stores and fires
   * `onClear` hooks.
   */
  applyTurnPacket(packet: TurnPacket): void {
    if (!this.currentManifest) {
      this.warn(
        '[channel-service] applyTurnPacket called before applyCmgt; ' +
          'turn packet ignored. Bootstrap order: cmgt before turn (ADR-163 §11).',
      );
      return;
    }

    // Check for a `clear` event in this turn packet — handle it
    // first so subsequent main/append channel emissions land in an
    // emptied store.
    const clearValue = packet.payload['clear'];
    if (clearValue !== undefined) {
      this.handleClear(clearValue);
    }

    // Walk the manifest in registration order. The payload's own
    // key order is irrelevant — manifest order is the contract.
    for (const channel of this.currentManifest.channels) {
      // The clear channel itself was already handled above; let
      // its renderer fire normally too (visual side-effects).
      if (!Object.prototype.hasOwnProperty.call(packet.payload, channel.id)) {
        continue;
      }
      const value = packet.payload[channel.id];
      this.applyChannelValue(channel, value);
    }
  }

  /**
   * Snapshot of the channel state store (deep-cloned) — for tests
   * and ADR-163 AC-12 round-trip.
   */
  getStateSnapshot(): ChannelStateStore {
    return deepClone(this.state) as ChannelStateStore;
  }

  // ────────────────────────────────────────────────────────────────
  //  Private — dispatch helpers
  // ────────────────────────────────────────────────────────────────

  /**
   * Update the state store per mode and invoke the renderer's
   * `onValue`.
   */
  private applyChannelValue(channel: ChannelDefinition, value: unknown): void {
    switch (channel.mode) {
      case 'replace': {
        this.state[channel.id] = value;
        break;
      }
      case 'append': {
        const entries = Array.isArray(value) ? value : [value];
        const existing = this.state[channel.id];
        const accumulator = Array.isArray(existing) ? existing : [];
        this.state[channel.id] = accumulator.concat(entries);
        break;
      }
      case 'event': {
        // Event channels do NOT write to the state store (ADR-165 §5).
        break;
      }
    }

    const renderer = this.resolveRenderer(channel.id);
    renderer.onValue(value, channel);
  }

  /**
   * Handle a `clear` channel emission (ADR-165 §4 step 2).
   *
   * `value.target` (when set) names a specific append-mode channel
   * to clear; an empty / missing target clears every append-mode
   * channel currently registered in the manifest.
   */
  private handleClear(value: unknown): void {
    if (!this.currentManifest) return;
    const target =
      value && typeof value === 'object' && 'target' in (value as Record<string, unknown>)
        ? ((value as Record<string, unknown>).target as string | undefined)
        : undefined;

    for (const channel of this.currentManifest.channels) {
      if (channel.mode !== 'append') continue;
      if (target !== undefined && target !== '' && channel.id !== target) continue;

      // Reset state store entry first (ADR-165 §4 says state is
      // reset BEFORE onClear runs).
      delete this.state[channel.id];

      const renderer = this.renderers.get(channel.id);
      renderer?.onClear?.(target ?? channel.id);
    }
  }

  /**
   * Resolve the renderer for a channel id. Returns the registered
   * renderer when present; otherwise lazily creates and caches a
   * JSON-tree fallback (so the one-time warning fires once per
   * channel id, not once per emission).
   */
  private resolveRenderer(channelId: string): ChannelRenderer {
    const registered = this.renderers.get(channelId);
    if (registered) return registered;
    let fallback = this.fallbackRenderers.get(channelId);
    if (!fallback) {
      fallback = this.buildFallback(channelId);
      this.fallbackRenderers.set(channelId, fallback);
    }
    return fallback;
  }
}

/**
 * Convenience factory for `new Renderer(opts)`.
 */
export function createRenderer(opts: RendererOptions = {}): Renderer {
  return new Renderer(opts);
}

/**
 * Deep-clone helper for `getStateSnapshot`. Uses `structuredClone`
 * when available; falls back to `JSON.parse(JSON.stringify(...))`
 * for compatibility with older runtimes.
 */
function deepClone<T>(value: T): T {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value);
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    // Last resort — return shallow copy if value cannot round-trip.
    return Array.isArray(value) ? ([...value] as unknown as T) : ({ ...value } as T);
  }
}
