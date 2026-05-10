/**
 * Prose pipeline service interface — engine-internal home for the
 * `ITextService` contract.
 *
 * Per ADR-174, the responsibility for translating events into blocks
 * moves into `@sharpee/engine`. The transitional `ITextService` name
 * is preserved here so engine code already typed against it (the
 * three `processTurn` call sites in `game-engine.ts` and the
 * `getTextService` / `setTextService` accessors) can keep compiling
 * during sub-phase 1.6's import swap. A follow-up cleanup may rename
 * this to `IProsePipeline` once the legacy alias is no longer
 * imported anywhere.
 *
 * Public interface: `ITextService`. Implemented by `ProsePipeline`
 * (and by `MockProsePipeline` in tests).
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-174 §Internal interfaces
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
export interface ITextService {
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
