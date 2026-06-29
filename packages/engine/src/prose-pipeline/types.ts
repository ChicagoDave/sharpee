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
import type { RenderContext } from '@sharpee/if-domain';

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
}
