/**
 * Block assembly stage
 *
 * Creates ITextBlock from resolved text, parsing decorations.
 *
 * @see ADR-091 Text Decorations
 * @see ADR-096 Text Service Architecture
 */

import type { ITextBlock, TextContent } from '@sharpee/text-blocks';
import { parseDecorations, hasDecorations } from '../decoration-parser.js';

/**
 * Create a TextBlock, parsing decorations if present
 */
export function createBlock(key: string, text: string): ITextBlock {
  const content: TextContent[] = hasDecorations(text)
    ? parseDecorations(text)
    : [text];

  return { key, content };
}

/**
 * Extract value from provider function or direct value
 */
export function extractValue(value: unknown): string | null {
  if (typeof value === 'function') {
    try {
      const result = value();
      return result ? String(result) : null;
    } catch {
      return null;
    }
  }

  return value ? String(value) : null;
}
