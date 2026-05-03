/**
 * @sharpee/if-domain — channel type contracts (ADR-163, closure-per-channel
 * model, 2026-05-02 rewrite + 2026-05-03 refinement).
 *
 * Owner context: domain layer. These types describe the channel-I/O
 * contract used by every package that participates in the channel system:
 *
 * - `@sharpee/channel-service` runs the closures (`ChannelService.build`).
 * - `@sharpee/stdlib` defines the standard `IOChannel` instances.
 * - `@sharpee/engine` composes the registry with the service and emits
 *   manifest / packet events.
 * - Consumers (`@sharpee/platform-browser`, multi-user web-client, CLI
 *   bundle) consume the wire packets via ADR-165 renderers.
 *
 * Public interface: the `IOChannel<T>` contract, the `IChannelRegistry`
 * registry shape, the `ChannelProduceContext` passed to closures, and the
 * three small enums (`ChannelContentType`, `ChannelMode`,
 * `ChannelEmitPolicy`) plus `ClientCapabilities` and `CapabilityFlag`.
 *
 * No implementation lives here. Per ADR-163 §14 and CLAUDE.md rule 7b:
 * if-domain is the single home for channel type contracts so co-located
 * client and server code share them by direct import, not duplication.
 *
 * @see ADR-163 — Channel-Service Platform — §6, §7, §14
 */

import type { ISemanticEvent } from '@sharpee/core';
import type { ITextBlock } from '@sharpee/text-blocks';

// ────────────────────────────────────────────────────────────────────
//  Channel content / mode / emit policy
// ────────────────────────────────────────────────────────────────────

/**
 * Channel content types (ADR-163 §3).
 *
 * - `text` — plain string. Renderer writes verbatim or styles.
 * - `number` — integer or float. Producer emits the number; client formats.
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
 *   or new entries were produced (`append`/`event`). Default for
 *   author-defined channels.
 */
export type ChannelEmitPolicy = 'always' | 'sparse';

// ────────────────────────────────────────────────────────────────────
//  Client capabilities
// ────────────────────────────────────────────────────────────────────

/**
 * Client capabilities declared at session start (ADR-163 §2).
 *
 * Fields preserve ADR-101's `ClientCapabilities` interface verbatim so
 * existing consumers can adopt without rewriting their declarations.
 *
 * The `ChannelService` filters capability-gated channels at manifest
 * production using these flags (`IOChannel.gatedBy`).
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
 * Subset of `ClientCapabilities` keys that name boolean flags. The
 * `text` field is always `true`; the dimension fields are numbers.
 *
 * `IOChannel.gatedBy` accepts only `CapabilityFlag` values: a channel
 * cannot gate on `text` (always true) or on screen dimensions (numeric).
 */
export type CapabilityFlag = Exclude<
  {
    [K in keyof ClientCapabilities]: ClientCapabilities[K] extends boolean
      ? K
      : never;
  }[keyof ClientCapabilities],
  'text'
>;

// ────────────────────────────────────────────────────────────────────
//  Channel definition (closure-per-channel model)
// ────────────────────────────────────────────────────────────────────

/**
 * Context passed to an `IOChannel.produce` closure (ADR-163 §6).
 *
 * The closure receives:
 *
 * - `world` — current world state (read-only from the producer's POV).
 *   Typed as `unknown` here because if-domain cannot import
 *   `IWorldModel` from `@sharpee/world-model` without creating a cycle
 *   (world-model depends on if-domain). Consumers in stdlib and engine
 *   narrow this at the call site:
 *   ```ts
 *   produce: (ctx) => {
 *     const world = ctx.world as IWorldModel;
 *     return world.getCapability('scoring');
 *   }
 *   ```
 *   The narrowing happens once per channel definition. The trade-off
 *   keeps if-domain dependency-clean; the alternative (replicating
 *   `IWorldModel` in if-domain) is a much larger refactor.
 *
 * - `events` — semantic events fired during the turn just executed.
 *   Frozen array; producers must not mutate.
 *
 * - `blocks` — text blocks produced by `text-service.processTurn` for
 *   the turn just executed. Frozen array.
 *
 * - `turn` — monotonic turn count for this session. Engine increments.
 *
 * - `prevValue` — the value this channel emitted on the previous turn,
 *   or `undefined` if no prior emission. Closures use this for
 *   diff-aware emission decisions and for append-mode awareness.
 *
 * Closures are pure functions of context. They project; they do not
 * mutate.
 */
export interface ChannelProduceContext {
  /**
   * World state for the current turn. Typed `unknown` to avoid an
   * if-domain → world-model cycle. Consumers cast at the call site.
   */
  readonly world: unknown;
  readonly events: readonly ISemanticEvent[];
  readonly blocks: readonly ITextBlock[];
  readonly turn: number;
  readonly prevValue: unknown | undefined;
}

/**
 * A typed channel definition with embedded producer (ADR-163 §6).
 *
 * Channels are objects. They carry identity (`id`), configuration
 * (`contentType`, `mode`, `emit`, optional `gatedBy`), and a
 * `produce(ctx)` closure that computes the channel's value for the
 * current turn.
 *
 * The closure return value drives emission semantics:
 *
 * - `T` — emit this value.
 * - `undefined` — skip emission this turn (sparse channels stay quiet;
 *   always channels re-emit their previous value).
 * - `null` — emit a hide / stop / clear signal (used by media channels
 *   per §9 and by `clear` per §12).
 *
 * For `append`-mode channels, return an array of new entries (or
 * `undefined` for "no new entries this turn"). For `replace` or `event`
 * mode, return a single value (or `undefined`).
 *
 * Story override of a standard channel = re-register an `IOChannel`
 * with the same `id` (last write wins per §6).
 */
export interface IOChannel<T = unknown> {
  readonly id: string;
  readonly contentType: ChannelContentType;
  readonly mode: ChannelMode;
  readonly emit: ChannelEmitPolicy;
  /** Capability flag this channel is gated by, if any. */
  readonly gatedBy?: CapabilityFlag;
  /**
   * Produce this channel's value for the current turn. See class
   * comment above for the return-shape contract.
   */
  readonly produce: (ctx: ChannelProduceContext) => T | T[] | undefined | null;
}

/**
 * Channel registry contract (ADR-163 §7, §14).
 *
 * The registry is a simple keyed collection of `IOChannel` instances.
 * It does not enforce mode invariants, capability filtering, or
 * registration order — those are the `ChannelService`'s job.
 *
 * `add(channel)` is last-write-wins by `channel.id`: re-registering an
 * id replaces the prior definition. This is how stories override
 * standard channels (per §6).
 *
 * Implementations live elsewhere:
 *
 * - `@sharpee/stdlib` exports a populated `channelRegistry` instance
 *   with the standard channels pre-registered (per §7).
 * - Engine bootstrap calls `Story.registerChannels?.(registry)` to let
 *   stories add or override channels.
 */
export interface IChannelRegistry {
  add(channel: IOChannel): void;
  get(id: string): IOChannel | undefined;
  all(): readonly IOChannel[];
}
