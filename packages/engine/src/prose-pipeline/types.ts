/**
 * Prose pipeline service interface — engine-internal home for the
 * `IProsePipeline` contract.
 *
 * Per ADR-174, the responsibility for translating events into blocks
 * moved into `@sharpee/engine`. The interface was introduced under the
 * transitional `ITextService` name during that migration; ADR-195
 * completes the anticipated cleanup and renames it to `IProsePipeline`
 * now that the legacy alias is engine-private (no external importer).
 * The `getTextService` / `setTextService` accessors on `GameEngine`
 * keep their names — only the interface type is renamed.
 *
 * Public interface: `IProsePipeline`. Implemented by `ProsePipeline`
 * (and by `MockProsePipeline` in tests).
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-174 §Internal interfaces
 * @see ADR-195 (interface rename + slot-contributor seam)
 */

import type { ISemanticEvent } from '@sharpee/core';
import type { ITextBlock } from '@sharpee/text-blocks';
import type { Phrase, RenderContext } from '@sharpee/if-domain';
import type { WorldModel } from '@sharpee/world-model';

/**
 * A realize-time slot contributor (ADR-195 §3).
 *
 * Holds a turn `RenderContext` and stages slot contributions into the turn's
 * slot store via `ctx.contribute(key, phrase)` — typically reading the live
 * world (the player's room → occupants for `'here'`; in-scope describable
 * objects → state clauses for `'detail'`). It runs at render time, before the
 * host messages realize, so it needs no turn-time (ADR-163) channel.
 */
export type SlotContributor = (ctx: RenderContext) => void;

/**
 * Gate on a declarative slot entry (ADR-212 §2).
 *
 * - `owner-present` (the default): the entry contributes iff the owner shares
 *   the player's containing room at staging time — the same transitive check
 *   the `mentions` gate uses.
 * - `predicate`: the registered-seam escape hatch (the ADR-211 Q4 posture) —
 *   a TS function supplied by whatever runtime owns the condition, called
 *   against the live world each staging pass. Never serialized; like every
 *   entry, re-registered on story load.
 */
export type SlotEntryGate =
  | { kind: 'owner-present' }
  | { kind: 'predicate'; holds: (world: WorldModel) => boolean };

/**
 * A declarative slot entry (ADR-212 §1): data in, prose out.
 *
 * One platform-owned staging step evaluates every registered entry each turn,
 * before story-registered `SlotContributor` closures run; an entry whose gate
 * holds contributes `content` to `slotKey` with `order`. Registration is keyed
 * `(slotKey, owner)`, idempotent-last-wins (AC-7); entries are never
 * unregistered mid-session and nothing here is serialized — callers
 * re-register every story load.
 */
export interface SlotEntry {
  /** The slot the entry feeds (`'here'` for the present channel). Any key is accepted (ADR-212 Q4). */
  slotKey: string;
  /** Owner entity id — the default gate's subject and the `Choice` counter keyspace. */
  owner: string;
  /** Bare contributed content (`Literal` | `Choice`) — the slot owns all joining. */
  content: Phrase;
  /** `SlotContributionOptions.order` for the slot's `(order asc, insertion asc)` sort; default 0. */
  order?: number;
  /** Contribution gate; default `{ kind: 'owner-present' }`. */
  gate?: SlotEntryGate;
  /**
   * `Choice` counter key; defaults to `slotKey`. Caller contract (ADR-212 §4):
   * `Choice` content must carry `entityId === owner` and
   * `messageKey === counterKey ?? slotKey` — the platform warns on mismatch
   * but never rewrites.
   */
  counterKey?: string;
}

/**
 * Per-turn prose translator.
 *
 * Stateless transformer: takes the events emitted during a turn,
 * returns the structured `ITextBlock[]` the channel layer hands off
 * to renderers. Engine constructs an implementation once during
 * `setStory()` and calls `processTurn` per turn (and per
 * meta-command / restart).
 */
export interface IProsePipeline {
  /**
   * Process turn events and produce TextBlocks.
   *
   * Called by Engine after each turn completes — and again on the
   * meta-command path (restart, restore) where the same per-turn
   * shape applies.
   *
   * @param events All events from this turn, including chained ones.
   * @returns Blocks in render order.
   */
  processTurn(events: ISemanticEvent[]): ITextBlock[];

  /**
   * Register a realize-time slot contributor (ADR-195 §3).
   *
   * The contributor runs once per turn — in registration order — at the top of
   * `processTurn`, before the event→render loop, against a turn `RenderContext`
   * whose `contribute` writes the shared per-turn slot store. Stories register
   * via the engine's `onEngineReady` hook. A no-op on world-less pipelines (no
   * per-turn render-context factory is built, so there is nothing to stage into).
   *
   * @param contributor the slot contributor to run each turn.
   */
  registerSlotContributor(contributor: SlotContributor): void;

  /**
   * Register a declarative slot entry (ADR-212 §1).
   *
   * Keyed `(slotKey, owner)`, idempotent-last-wins: re-registering the same key
   * replaces the prior entry — one contribution, never two (AC-7). Entries are
   * evaluated once per turn in the staging pass, BEFORE story-registered slot
   * contributors, and contribute only while their gate holds. Nothing is
   * serialized; callers re-register every story load.
   *
   * @param entry the slot entry to register (or replace).
   */
  registerSlotEntry(entry: SlotEntry): void;
}
