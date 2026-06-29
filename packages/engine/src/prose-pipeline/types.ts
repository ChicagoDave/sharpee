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
}
