/**
 * @sharpee/text-blocks
 *
 * TextBlock interfaces for Sharpee's text output system.
 *
 * This package defines the contract between:
 * - TextService (produces ITextBlock[])
 * - Clients (consume ITextBlock[] and render)
 *
 * Inspired by FyreVM channel I/O (2009).
 *
 * @see ADR-096 Text Service Architecture
 * @see ADR-091 Text Decorations
 */

// Types
export type { TextContent, IDecoration, ITextBlock } from './types';
export { CORE_DECORATION_TYPES, BLOCK_KEY_PREFIXES, BLOCK_KEYS } from './types';

// Type guards
export {
  isDecoration,
  isTextBlock,
  hasKeyPrefix,
  isStatusBlock,
  isRoomBlock,
  isActionBlock,
  extractPlainText,
} from './guards';
