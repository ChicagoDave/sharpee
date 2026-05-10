/**
 * @sharpee/text-service
 *
 * Block-production service for Sharpee that:
 * - Receives semantic events
 * - Resolves templates via LanguageProvider
 * - Parses decorations into structured IDecoration tree
 * - Outputs `ITextBlock[]` consumed by `@sharpee/channel-service`'s
 *   `mainChannel.produce` closure (per ADR-163 §6) and by downstream
 *   consumers that still drive `renderToString` directly.
 *
 * Inspired by FyreVM channel I/O (2009).
 *
 * **ADR-163 post-rewrite status (2026-05-03):** the engine still calls
 * `TextService.processTurn` per turn to produce blocks; those blocks
 * feed both the legacy `text:output` event AND the new
 * `channel:packet` event. text-service's **block-production** role is
 * permanent.
 *
 * The **wire-production** role (`renderToString`, `renderStatusLine`,
 * `CLIRenderOptions`) is **retired for first-party platform consumers** —
 * `dist/cli/sharpee.js` (R6) and `@sharpee/platform-browser` (R5-C)
 * both consume `channel:packet` events through ADR-165 renderers. The
 * exports remain in the public API for downstream consumers that still
 * use them:
 *  - `@sharpee/transcript-tester` — internal test harness
 *  - `@sharpee/zifmia` — story-author runtime UI
 *  - `@sharpee/bridge`, `@sharpee/runtime` — story scaffolding
 *  - `@sharpee/sharpee` package re-exports
 *
 * Removing them now would break those consumers without a migration
 * path. They are deprecated rather than deleted.
 *
 * See `docs/work/channel-io-unification/text-service-disposition-20260503.md`
 * for the export-by-export disposition table.
 *
 * @see ADR-096 Text Service Architecture
 * @see ADR-163 Channel-Service Platform
 * @see ADR-165 Renderer Architecture
 */

// Text service
export type { ITextService } from './text-service.js';
export { TextService, createTextService } from './text-service.js';

// Pipeline stages
export { filterEvents } from './stages/filter.js';
export { sortEventsForProse, getChainMetadata } from './stages/sort.js';
export { createBlock, extractValue } from './stages/assemble.js';

// Event handlers
export type { EventHandler, HandlerContext, ChainableEventData, GenericEventData } from './handlers/types.js';
export { handleRoomDescription } from './handlers/room.js';
export { handleRevealed } from './handlers/revealed.js';
export { handleGameMessage, handleGenericEvent } from './handlers/generic.js';

// Decoration parser
export { parseDecorations, hasDecorations } from './decoration-parser.js';

// CLI renderer
export type { CLIRenderOptions } from './cli-renderer.js';
export { renderToString, renderStatusLine } from './cli-renderer.js';

// Re-export text-blocks types for convenience
// `CORE_DECORATION_TYPES` removed per ADR-174 — the closed vocabulary
// now lives in `@sharpee/engine/src/prose-pipeline/decorations/platform-vocabulary.ts`
// and is engine-internal.
export type { ITextBlock, IDecoration, TextContent } from '@sharpee/text-blocks';
export {
  isDecoration,
  isTextBlock,
  isStatusBlock,
  isRoomBlock,
  isActionBlock,
  extractPlainText,
  BLOCK_KEYS,
  BLOCK_KEY_PREFIXES,
} from '@sharpee/text-blocks';
