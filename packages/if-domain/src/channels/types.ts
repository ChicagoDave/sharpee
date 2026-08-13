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
import type { ITextBlock, TextContent } from '@sharpee/text-blocks';

// ────────────────────────────────────────────────────────────────────
//  Channel content / mode / emit policy
// ────────────────────────────────────────────────────────────────────

/**
 * Channel content types (ADR-163 §3).
 *
 * - `text` — plain string. Renderer writes verbatim or styles.
 * - `number` — integer or float. Producer emits the number; client formats.
 * - `json` — structured object. Escape hatch for author-defined surfaces
 *   and for the platform's prose channels, which carry `ProseEntry[]`.
 */
export type ChannelContentType = 'text' | 'number' | 'json';

/**
 * A single entry in a prose channel's append-mode value array.
 *
 * Each entry corresponds to one `<p>`-equivalent surface in a text
 * renderer. The wire value of a prose channel (`room-name`,
 * `room-description`, `room-contents`, `action-result`,
 * `action-blocked`, `error`, `game-message`) is `ProseEntry[]` — the
 * new entries that channel produced this turn.
 *
 * Per ADR-300 D8 there is no catch-all `main` channel: each element of
 * the turn's prose is its own channel, and the order they read in rides
 * `preferred-layout` (D9) rather than being implied by one append
 * stream. `ProseEntry` is what a single element looks like once it
 * reaches the wire; the ordering across elements is not its business.
 *
 * Per the prose-pipeline pre-line removal (session 2026-05-12), every
 * intra-block `\n` was lifted to a block boundary. Where the former
 * `\n` was inside a paragraph (book text under its prefix, banner
 * lines under a title), the second-and-later block carries
 * `tight: true` and the renderer collapses the inter-paragraph margin
 * so the lines stack flush.
 *
 * Invariant: a `tight` entry must not appear first in the turn's
 * *composed* prose — the renderer relies on a non-tight predecessor,
 * which may live on a different channel. Composition order therefore
 * has to be restored (see `composeProse`) before a `tight` flag can be
 * interpreted; a channel's own entry array is not the sequence the
 * flag refers to.
 */
export interface ProseEntry {
  /** Content of this entry — strings and decorations, no `\n` in any string. */
  readonly content: ReadonlyArray<TextContent>;
  /** Visual continuation hint. See type-level doc above. */
  readonly tight?: boolean;
  /**
   * Optional semantic CSS class the renderer applies to the rendered
   * element in addition to its own entry class. Mirrors
   * `ITextBlock.className` — used by the prose pipeline to flow
   * per-piece visual identity through the channel wire to the browser
   * renderer.
   */
  readonly className?: string;
}

/**
 * Wire value of the `preferred-layout` channel (ADR-300 D9).
 *
 * One entry per prose entry emitted this turn, naming the channel that
 * produced it, in the order the engine thinks its output reads. A
 * channel id repeats when that channel produced more than one entry:
 * `['game-message', 'room-name', 'game-message']` means "the first
 * `game-message` entry, then the first `room-name` entry, then the
 * second `game-message` entry."
 *
 * It is a *preference*, not an instruction. A client may honour the
 * order, reorder it, or ignore it entirely — which is the point of
 * putting ordering on its own channel instead of inside the narrative
 * channels. Reordering this list changes what the player sees with no
 * engine change.
 */
export type PreferredLayout = ReadonlyArray<string>;

/**
 * Channel id carrying the per-turn prose reading order (ADR-300 D9).
 */
export const PREFERRED_LAYOUT_CHANNEL = 'preferred-layout';

/**
 * The platform's prose channel ids (ADR-300 D8) — the seven elements
 * the dissolved `main` channel used to carry as one stream.
 *
 * This lives in if-domain rather than stdlib because it is wire
 * vocabulary: the engine-side producer (stdlib) and every consumer (the
 * browser renderers, the CLI bundle, the headless
 * harness) must agree on these strings, and a duplicated list is a
 * protocol drift waiting to happen. What each id *means in terms of
 * text blocks* is stdlib's business and stays there.
 *
 * Order is registration order, not render order — render order is
 * per-turn and rides `preferred-layout`.
 */
export const PROSE_CHANNEL_IDS = [
  'room-name',
  'room-description',
  'room-contents',
  'action-result',
  'action-blocked',
  'error',
  'game-message',
] as const;

/** One of the platform's prose channel ids. */
export type ProseChannelId = (typeof PROSE_CHANNEL_IDS)[number];

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
