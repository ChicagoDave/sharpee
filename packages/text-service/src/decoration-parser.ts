/**
 * Decoration Parser
 *
 * Parses decoration syntax from resolved templates into IDecoration structures.
 *
 * Supports:
 * - [type:content] - semantic decorations
 * - *emphasis* - emphasis
 * - **strong** - strong emphasis
 * - Nested decorations
 * - Escaped characters: \*, \[, \]
 *
 * @see ADR-091 Text Decorations
 */

import type { TextContent, IDecoration } from '@sharpee/text-blocks';

/**
 * Parse decorated text into TextContent array.
 *
 * @example
 * parseDecorations('You take [item:the sword].')
 * // Returns: ['You take ', { type: 'item', content: ['the sword'] }, '.']
 *
 * parseDecorations('The lantern glows *brightly*.')
 * // Returns: ['The lantern glows ', { type: 'em', content: ['brightly'] }, '.']
 */
export function parseDecorations(text: string): TextContent[] {
  if (!text) return [];

  const result: TextContent[] = [];
  let current = '';
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    // Handle escape sequences
    if (char === '\\' && i + 1 < text.length) {
      const nextChar = text[i + 1];
      if (nextChar === '*' || nextChar === '[' || nextChar === ']' || nextChar === '\\') {
        current += nextChar;
        i += 2;
        continue;
      }
    }

    // Handle [type:content] decorations
    if (char === '[') {
      const closeIndex = findMatchingBracket(text, i);
      if (closeIndex !== -1) {
        // Flush current text
        if (current) {
          result.push(current);
          current = '';
        }

        const inner = text.slice(i + 1, closeIndex);
        const colonIndex = inner.indexOf(':');

        if (colonIndex !== -1) {
          const type = inner.slice(0, colonIndex);
          const content = inner.slice(colonIndex + 1);

          // Recursively parse content for nested decorations
          const decoration: IDecoration = {
            type,
            content: parseDecorations(content),
          };
          result.push(decoration);
        } else {
          // No colon - treat as literal text
          current += text.slice(i, closeIndex + 1);
        }

        i = closeIndex + 1;
        continue;
      }
    }

    // Handle **strong** (check before single *)
    if (char === '*' && text[i + 1] === '*') {
      const closeIndex = text.indexOf('**', i + 2);
      if (closeIndex !== -1) {
        // Flush current text
        if (current) {
          result.push(current);
          current = '';
        }

        const content = text.slice(i + 2, closeIndex);
        const decoration: IDecoration = {
          type: 'strong',
          content: parseDecorations(content),
        };
        result.push(decoration);

        i = closeIndex + 2;
        continue;
      }
    }

    // Handle *emphasis*
    if (char === '*') {
      const closeIndex = findSingleAsterisk(text, i + 1);
      if (closeIndex !== -1) {
        // Flush current text
        if (current) {
          result.push(current);
          current = '';
        }

        const content = text.slice(i + 1, closeIndex);
        const decoration: IDecoration = {
          type: 'em',
          content: parseDecorations(content),
        };
        result.push(decoration);

        i = closeIndex + 1;
        continue;
      }
    }

    // Regular character
    current += char;
    i++;
  }

  // Flush remaining text
  if (current) {
    result.push(current);
  }

  return result;
}

/**
 * Find matching closing bracket, handling nesting.
 */
function findMatchingBracket(text: string, openIndex: number): number {
  let depth = 1;
  let i = openIndex + 1;

  while (i < text.length && depth > 0) {
    const char = text[i];

    // Handle escapes
    if (char === '\\' && i + 1 < text.length) {
      i += 2;
      continue;
    }

    if (char === '[') {
      depth++;
    } else if (char === ']') {
      depth--;
    }

    if (depth === 0) {
      return i;
    }

    i++;
  }

  return -1; // No matching bracket
}

/**
 * Find closing single asterisk (not part of **).
 */
function findSingleAsterisk(text: string, startIndex: number): number {
  let i = startIndex;

  while (i < text.length) {
    const char = text[i];

    // Handle escapes
    if (char === '\\' && i + 1 < text.length) {
      i += 2;
      continue;
    }

    // Found single asterisk (not part of **)
    if (char === '*' && text[i + 1] !== '*' && (i === startIndex || text[i - 1] !== '*')) {
      return i;
    }

    i++;
  }

  return -1;
}

/**
 * Check if text contains any decoration markers.
 */
export function hasDecorations(text: string): boolean {
  // Quick check for decoration markers
  return /[*\[]/.test(text);
}
