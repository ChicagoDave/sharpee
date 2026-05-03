/**
 * @sharpee/channel-service — `ChannelService` class.
 *
 * Owner context: platform package — runs in-process wherever the engine
 * runs (Node CLI, multi-user server, browser zifmia, platform-browser).
 *
 * Public interface (per ADR-163 §6, §13, §14):
 *
 * - `ChannelService` — concrete runtime. Constructor takes an
 *   `IChannelRegistry` plus the client's `ClientCapabilities`.
 *   - `buildManifest()` — returns a `CmgtPacket` listing the
 *     capability-filtered channel definitions.
 *   - `build({ world, events, blocks, turn })` — walks the registry,
 *     calls each `IOChannel.produce` closure, applies mode + emit-policy
 *     semantics, and returns a `TurnPacket`.
 *
 * Lifecycle (ADR-163 §13): instances are cheap. A new session (engine
 * restart, story switch, RESTART command) creates a fresh
 * `ChannelService`. There is no global session state — `prevValues`
 * lives on the instance.
 *
 * Bootstrap-order invariants (engine-enforced, not service-enforced):
 * the engine emits `channel:manifest` before any `channel:packet`
 * because it calls `buildManifest()` once during `start()` before
 * entering the turn loop. This service does not throw on
 * out-of-order calls; engineers reading the engine code can trace the
 * order from the engine's startup sequence.
 *
 * @see ADR-163 — Channel-Service Platform — §6, §11, §13, §14
 * @see ADR-165 — Renderer Architecture (consumer side)
 */

import type {
  IChannelRegistry,
  IOChannel,
  ClientCapabilities,
  ChannelDefinition,
  ChannelProduceContext,
  CmgtPacket,
  TurnPacket,
} from '@sharpee/if-domain';
import type { ITextBlock } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';

/**
 * Wire-protocol version emitted in every CMGT manifest. Bumped on
 * breaking shape changes to packet kinds or `ChannelDefinition` fields.
 * Additive channels do not bump version.
 */
export const PROTOCOL_VERSION = 1;

/**
 * Input to {@link ChannelService.build}.
 *
 * `world` is typed `unknown` here for consistency with
 * `ChannelProduceContext` (if-domain cannot import `IWorldModel`).
 * Engine call sites pass an `IWorldModel`; closures cast at the
 * boundary.
 */
export interface BuildInput {
  readonly world: unknown;
  readonly events: readonly ISemanticEvent[];
  readonly blocks: readonly ITextBlock[];
  /** Monotonic turn count supplied by the engine. Used for `turn_id`. */
  readonly turn: number;
}

/**
 * The channel-service runtime.
 *
 * One instance per session. Composes a channel registry (typically
 * `@sharpee/stdlib`'s `channelRegistry`) with the negotiated client
 * capabilities. Holds per-channel previous-value state for sparse-emit
 * change detection and `always`-mode replace re-emission.
 */
export class ChannelService {
  /**
   * Per-channel previous emitted value. Replace-mode channels store the
   * latest emitted value (used both for sparse change detection and for
   * `always`-mode idle-turn re-emission). Append-mode channels store the
   * total accumulated entry count (for diagnostics; the renderer owns
   * accumulation per ADR-165 §5). Event-mode channels do not consult
   * prevValue.
   */
  private readonly prevValues = new Map<string, unknown>();

  constructor(
    private readonly registry: IChannelRegistry,
    private readonly capabilities: ClientCapabilities,
  ) {}

  /**
   * Build the per-client CMGT manifest (ADR-163 §11).
   *
   * Walks every registered channel. Capability-gated channels
   * (`IOChannel.gatedBy`) are filtered out when the named capability is
   * not declared `true` for this client. Returns a fresh manifest each
   * call; safe to invoke multiple times (the engine calls it once
   * during `start()`).
   */
  buildManifest(): CmgtPacket {
    const channels: ChannelDefinition[] = [];
    for (const channel of this.registry.all()) {
      if (this.isGatedOut(channel)) continue;
      channels.push(toDefinition(channel));
    }
    return {
      kind: 'cmgt',
      protocol_version: PROTOCOL_VERSION,
      channels,
    };
  }

  /**
   * Build the turn packet for the turn just executed (ADR-163 §1, §5).
   *
   * For each registered, non-gated channel:
   *  1. Builds a {@link ChannelProduceContext} with the channel's
   *     `prevValue` from this instance's cache.
   *  2. Calls `channel.produce(ctx)`.
   *  3. Applies mode + emit-policy semantics to the return value to
   *     decide whether the channel appears in this turn's payload and
   *     what value it carries.
   *  4. Updates the per-channel `prevValue` cache.
   *
   * Returns a `TurnPacket` whose `payload` contains only the channels
   * that emitted this turn. Sparse channels stay quiet on no-change;
   * always channels appear every turn.
   */
  build(input: BuildInput): TurnPacket {
    const payload: Record<string, unknown> = {};

    for (const channel of this.registry.all()) {
      if (this.isGatedOut(channel)) continue;

      const prevValue = this.prevValues.get(channel.id);
      const ctx: ChannelProduceContext = {
        world: input.world,
        events: input.events,
        blocks: input.blocks,
        turn: input.turn,
        prevValue,
      };

      const produced = channel.produce(ctx);
      this.applyEmission(channel, produced, prevValue, payload);
    }

    return {
      kind: 'turn',
      turn_id: `turn-${input.turn}`,
      payload,
    };
  }

  /**
   * True if the channel's `gatedBy` flag is set and the client did not
   * declare that capability as `true`. Gated-out channels appear neither
   * in the manifest nor in turn packets.
   */
  private isGatedOut(channel: IOChannel): boolean {
    if (channel.gatedBy === undefined) return false;
    return this.capabilities[channel.gatedBy] !== true;
  }

  /**
   * Apply mode + emit-policy semantics to a closure's return value.
   *
   * Mutates `payload` (sets `payload[channel.id]` if the channel
   * emits) and `this.prevValues` (records the new value for sparse
   * compare and idle re-emission).
   *
   * Mode semantics (ADR-163 §4, §6):
   *
   *  - `replace`:
   *     * `undefined` — `always` re-emits prevValue (idle turn);
   *       `sparse` skips.
   *     * `null` — emit `null` (hide / stop signal); cache `null`.
   *     * value — `always` emits unconditionally; `sparse` emits only
   *       on change. Cache the new value.
   *
   *  - `append`:
   *     * `undefined` — skip (no new entries this turn).
   *     * `null` — treated as "no new entries"; skip.
   *     * scalar — wrapped into a single-element array (closure
   *       convenience: `produce: () => 'line'` works without `[]`).
   *     * array (possibly empty) — `always` emits the array as-is;
   *       `sparse` emits only when non-empty. The renderer owns
   *       accumulation per ADR-165 §5.
   *
   *  - `event`:
   *     * `undefined` / `null` — skip (event channels emit only on
   *       fire). Emit policy is informative only — `event` mode is
   *       inherently sparse.
   *     * value — emit the value (transient signal).
   *
   * The closure return type `T | T[] | undefined | null` allows append
   * mode to return entries directly while replace and event return a
   * scalar. Append's scalar-as-shortcut is documented above.
   */
  private applyEmission(
    channel: IOChannel,
    produced: unknown,
    prevValue: unknown,
    payload: Record<string, unknown>,
  ): void {
    const emit = channel.emit;

    switch (channel.mode) {
      case 'replace': {
        if (produced === undefined) {
          if (emit === 'always' && prevValue !== undefined) {
            payload[channel.id] = prevValue;
          }
          return;
        }
        // `produced` is either a real value or `null` (hide signal).
        // Both go through the same change-detection path: sparse
        // channels only emit on transition; always channels emit each
        // turn. The cached prevValue tracks `null` so a subsequent
        // null-return on a sparse channel is recognized as no-change.
        if (emit === 'always' || !valueEquals(produced, prevValue)) {
          payload[channel.id] = produced;
        }
        this.prevValues.set(channel.id, produced);
        return;
      }

      case 'append': {
        if (produced === undefined || produced === null) return;
        const entries = Array.isArray(produced) ? produced : [produced];
        if (emit === 'always') {
          payload[channel.id] = entries;
        } else if (entries.length > 0) {
          payload[channel.id] = entries;
        }
        // Track entry count for diagnostics; renderer owns the buffer.
        const prevCount = typeof prevValue === 'number' ? prevValue : 0;
        this.prevValues.set(channel.id, prevCount + entries.length);
        return;
      }

      case 'event': {
        if (produced === undefined || produced === null) return;
        // Multi-firing in one turn collapses to the closure's last
        // return value — the closure itself is the single fire site.
        payload[channel.id] = produced;
        return;
      }
    }
  }
}

/**
 * Project an `IOChannel` into a wire-shaped `ChannelDefinition`.
 *
 * The closure does not cross the wire; only identity and configuration.
 */
function toDefinition(channel: IOChannel): ChannelDefinition {
  return {
    id: channel.id,
    contentType: channel.contentType,
    mode: channel.mode,
    emit: channel.emit,
  };
}

/**
 * Deep value equality for sparse-emit change detection.
 *
 * Uses `JSON.stringify` for object/array compares — adequate for the
 * value shapes carried over the wire (scalars, plain objects, arrays
 * of scalars or text content nodes). Not safe for cyclic graphs, but
 * those cannot cross the JSON wire anyway.
 */
function valueEquals(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}
