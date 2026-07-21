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

import { resolveClassName } from './resolver.js';
import { VOID_MACROS } from './platform-vocabulary.js';
import type { IDecoration, TextContent } from './types.js';

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

    const escapeChar = consumeEscape(template, i);
    if (escapeChar !== null) {
      current += escapeChar;
      i += 2;
      continue;
    }

    if (char === '[') {
      const bracket = parseBracketAt(template, i);
      if (bracket.kind === 'literal') {
        current += bracket.text;
        i = bracket.nextIndex;
        continue;
      }
      flush();
      if (bracket.kind === 'children') {
        result.push(...bracket.children);
      } else {
        result.push(bracket.decoration);
      }
      i = bracket.nextIndex;
      continue;
    }

    current += char;
    i++;
  }

  flush();

  return result;
}

/**
 * Inspect `template[i..i+1]` for an escape sequence (`\[`, `\]`,
 * `\\`). Returns the literal character to emit, or null if no escape
 * applies.
 */
function consumeEscape(template: string, i: number): string | null {
  if (template[i] !== '\\' || i + 1 >= template.length) return null;
  const next = template[i + 1];
  if (next !== '[' && next !== ']' && next !== '\\') return null;
  return next;
}

type BracketResult =
  | { kind: 'literal'; text: string; nextIndex: number }
  | { kind: 'children'; children: TextContent[]; nextIndex: number }
  | { kind: 'decoration'; decoration: IDecoration; nextIndex: number };

/**
 * Parse the `[...]` segment starting at `openIndex`. Caller has
 * already verified `template[openIndex] === '['`.
 *
 * Outcomes (per ADR-174 AC-10..AC-12):
 *  - `literal` — unclosed bracket or bracket without `:` (the whole
 *    segment is treated as plain text).
 *  - `children` — empty class name (`[:content]`); inner content is
 *    parsed and inlined without a wrapping decoration.
 *  - `decoration` — well-formed `[name:content]`; produces a
 *    structured `IDecoration`.
 */
function parseBracketAt(template: string, openIndex: number): BracketResult {
  const closeIndex = findMatchingBracket(template, openIndex);
  if (closeIndex === -1) {
    // AC-10: unclosed bracket → emit the `[` literal, advance one char.
    return { kind: 'literal', text: template[openIndex], nextIndex: openIndex + 1 };
  }

  const inner = template.slice(openIndex + 1, closeIndex);
  const colonIndex = indexOfUnescapedColon(inner);
  const nextIndex = closeIndex + 1;

  if (colonIndex === -1) {
    // ADR-183: a colon-less `[name]` is a void macro (e.g. `[br]`, `[p]`) iff the
    // name is registered; otherwise AC-11 applies and the whole segment is literal.
    if (VOID_MACROS.has(inner)) {
      return {
        kind: 'decoration',
        decoration: { className: resolveClassName(inner), content: [] },
        nextIndex,
      };
    }
    return { kind: 'literal', text: template.slice(openIndex, nextIndex), nextIndex };
  }

  const namePart = inner.slice(0, colonIndex);
  const innerContent = inner.slice(colonIndex + 1);

  // ADR-183: an optional `=value` in the name segment carries a parameter
  // (e.g. `[center=50:…]`). Split on the first `=`; the value may itself contain
  // `=`. Content (after the colon) is unaffected.
  let rawName = namePart;
  let value: string | undefined;
  const eqIndex = namePart.indexOf('=');
  if (eqIndex !== -1) {
    rawName = namePart.slice(0, eqIndex);
    value = namePart.slice(eqIndex + 1);
  }

  if (rawName === '') {
    // AC-12: empty class name → emit inner content as plain entries (value ignored).
    return { kind: 'children', children: parseDecorations(innerContent), nextIndex };
  }

  const decoration: IDecoration =
    value !== undefined
      ? { className: resolveClassName(rawName), content: parseDecorations(innerContent), value }
      : { className: resolveClassName(rawName), content: parseDecorations(innerContent) };

  return { kind: 'decoration', decoration, nextIndex };
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
