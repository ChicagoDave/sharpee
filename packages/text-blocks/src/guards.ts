/**
 * Type Guards for TextBlock types
 *
 * Utilities for safely working with TextContent, IDecoration, and ITextBlock.
 */

import type { TextContent, IDecoration, ITextBlock } from './types';

/**
 * Check if content is a decoration (not a plain string).
 *
 * @example
 * const content: TextContent = getContent();
 * if (isDecoration(content)) {
 *   console.log(content.type); // TypeScript knows this is IDecoration
 * }
 */
export function isDecoration(content: TextContent): content is IDecoration {
  return typeof content === 'object' && content !== null && 'type' in content && 'content' in content;
}

/**
 * Check if a value is a valid TextBlock.
 *
 * @example
 * if (isTextBlock(value)) {
 *   console.log(value.key);
 * }
 */
export function isTextBlock(value: unknown): value is ITextBlock {
  return (
    typeof value === 'object' &&
    value !== null &&
    'key' in value &&
    'content' in value &&
    typeof (value as ITextBlock).key === 'string' &&
    Array.isArray((value as ITextBlock).content)
  );
}

/**
 * Check if a block key starts with a given prefix.
 *
 * @example
 * if (hasKeyPrefix(block, 'status.')) {
 *   // Render to status bar
 * }
 */
export function hasKeyPrefix(block: ITextBlock, prefix: string): boolean {
  return block.key.startsWith(prefix);
}

/**
 * Check if a block is a status block.
 */
export function isStatusBlock(block: ITextBlock): boolean {
  return hasKeyPrefix(block, 'status.');
}

/**
 * Check if a block is a room-related block.
 */
export function isRoomBlock(block: ITextBlock): boolean {
  return hasKeyPrefix(block, 'room.');
}

/**
 * Check if a block is an action-related block.
 */
export function isActionBlock(block: ITextBlock): boolean {
  return hasKeyPrefix(block, 'action.');
}

/**
 * Extract plain text from TextContent, stripping all decorations.
 *
 * @example
 * const text = extractPlainText([
 *   'You take ',
 *   { type: 'item', content: ['the sword'] },
 *   '.'
 * ]);
 * // Returns: "You take the sword."
 */
export function extractPlainText(content: ReadonlyArray<TextContent>): string {
  return content
    .map((item) => {
      if (typeof item === 'string') {
        return item;
      }
      return extractPlainText(item.content);
    })
    .join('');
}
