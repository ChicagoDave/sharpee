/**
 * @sharpee/text-service
 *
 * Single text service for Sharpee that:
 * - Receives semantic events
 * - Resolves templates via LanguageProvider
 * - Parses decorations into structured IDecoration tree
 * - Outputs ITextBlock[]
 *
 * Includes CLI renderer for testing and CLI clients.
 *
 * Inspired by FyreVM channel I/O (2009).
 *
 * **ADR-163 Phase 3 status (2026-05-01):** text-service still produces
 * `ITextBlock[]` per turn (engine still calls `TextService.processTurn`).
 * Its **wire-producing** role is **deprecated for the CLI consumer**:
 * `dist/cli/sharpee.js` no longer calls `renderToString` to emit the
 * consumer-facing event stream. Instead, the CLI bundle wraps each
 * turn's blocks through `@sharpee/channel-service`'s `produceTurnPacket`
 * and renders the `main` channel.
 *
 * `renderToString` and `renderStatusLine` remain in the public API and
 * are still consumed by:
 *  - `packages/transcript-tester/` (internal test harness)
 *  - `packages/platform-browser/` (browser surface — Phase 4 will migrate)
 *
 * Phase 4 retires those remaining consumers; at that point this
 * exporting module collapses to block-production only.
 *
 * @see ADR-096 Text Service Architecture
 * @see ADR-163 Channel-Service Platform — Phase 3 (CLI migration)
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
  CORE_DECORATION_TYPES,
} from '@sharpee/text-blocks';
