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
export type { ITextService } from './text-service';
export { TextService, createTextService } from './text-service';

// Decoration parser
export { parseDecorations, hasDecorations } from './decoration-parser';

// CLI renderer
export type { CLIRenderOptions } from './cli-renderer';
export { renderToString, renderStatusLine } from './cli-renderer';

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
