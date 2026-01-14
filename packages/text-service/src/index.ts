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
 * @see ADR-096 Text Service Architecture
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
export { handleActionSuccess, handleActionFailure } from './handlers/action.js';
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
