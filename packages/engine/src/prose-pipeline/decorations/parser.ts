/**
 * Bracket parser — markup string → structured `TextContent[]` tree.
 *
 * Public interface: `parseDecorations(template) → TextContent[]`.
 * Pure function; same input always yields same output.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-174 §Markup syntax
 * @see ADR-174 §Internal interfaces
 * @see ADR-174 acceptance criteria AC-1..AC-5, AC-10..AC-12
 */

import { resolveClassName } from './resolver';
import type { IDecoration, TextContent } from './types';

/**
 * Parse a template string into a `TextContent[]` tree.
 *
 * Bracket markup `[name:content]` becomes an `IDecoration` whose
 * `className` is the result of `resolveClassName(name)`. Plain runs
 * stay as strings. Nesting recurses. Escape sequences `\[`, `\]`,
 * `\\` produce literal characters.
 *
 * Forgiving rules (ADR-174 AC-10..AC-12):
 *  - An unclosed `[` is treated as a literal character; the tail of
 *    the string remains unparsed text.
 *  - A bracket without `:` (e.g., `[em world]`) is emitted as literal
 *    `[em world]` — no decoration created.
 *  - A bracket with empty class name (e.g., `[:world]`) yields the
 *    parsed inner content directly, with no decoration wrapper.
 *
 * @param template Raw template string, post message-id resolution.
 * @returns Flat array of strings and decorations.
 */
export function parseDecorations(template: string): TextContent[] {
  if (!template) return [];

  const result: TextContent[] = [];
  let current = '';
  let i = 0;

  const flush = (): void => {
    if (current.length > 0) {
      result.push(current);
      current = '';
    }
  };

  while (i < template.length) {
    const char = template[i];

    if (char === '\\' && i + 1 < template.length) {
      const next = template[i + 1];
      if (next === '[' || next === ']' || next === '\\') {
        current += next;
        i += 2;
        continue;
      }
    }

    if (char === '[') {
      const closeIndex = findMatchingBracket(template, i);
      if (closeIndex === -1) {
        // AC-10: unclosed bracket → literal text from here on.
        current += char;
        i++;
        continue;
      }

      const inner = template.slice(i + 1, closeIndex);
      const colonIndex = indexOfUnescapedColon(inner);

      if (colonIndex === -1) {
        // AC-11: no colon → entire `[...]` segment is literal text.
        current += template.slice(i, closeIndex + 1);
        i = closeIndex + 1;
        continue;
      }

      const rawName = inner.slice(0, colonIndex);
      const innerContent = inner.slice(colonIndex + 1);

      flush();

      if (rawName === '') {
        // AC-12: empty class name → emit inner content as plain
        // entries with no wrapping decoration.
        const innerParsed = parseDecorations(innerContent);
        for (const piece of innerParsed) {
          result.push(piece);
        }
      } else {
        const decoration: IDecoration = {
          className: resolveClassName(rawName),
          content: parseDecorations(innerContent),
        };
        result.push(decoration);
      }

      i = closeIndex + 1;
      continue;
    }

    current += char;
    i++;
  }

  flush();

  return result;
}

/**
 * Find the matching `]` for the `[` at `openIndex`, respecting
 * nested brackets and `\\[` / `\\]` escapes. Returns -1 if no match
 * exists (string ends mid-bracket).
 */
function findMatchingBracket(text: string, openIndex: number): number {
  let depth = 1;
  let i = openIndex + 1;

  while (i < text.length) {
    const char = text[i];

    if (char === '\\' && i + 1 < text.length) {
      i += 2;
      continue;
    }

    if (char === '[') {
      depth++;
    } else if (char === ']') {
      depth--;
      if (depth === 0) return i;
    }

    i++;
  }

  return -1;
}

/**
 * Find the first unescaped `:` in `inner`. Returns -1 if none.
 *
 * Inside the `name:content` payload of a bracket, `\\:` is treated as
 * a literal colon — although there's no current need to escape colons
 * (they're not part of the platform vocabulary), the safer parse rule
 * is to treat backslash as a one-character escape uniformly.
 */
function indexOfUnescapedColon(inner: string): number {
  let i = 0;
  while (i < inner.length) {
    const char = inner[i];
    if (char === '\\' && i + 1 < inner.length) {
      i += 2;
      continue;
    }
    if (char === ':') return i;
    i++;
  }
  return -1;
}
