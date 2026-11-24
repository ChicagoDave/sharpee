/**
 * locate.ts — where in the source a phrase the analyzer read actually sits.
 *
 * Purpose: a finding names a phrase inside a passage, and a passage is a region,
 * not a line — `scullery.description` runs lines 18 to 19 and its `whetstone`
 * opens 19. Given the source text, this module finds the phrase's own span, so
 * the document can say exactly where the author wrote it.
 *
 * **The prose is not the source.** A `ProseSite`'s text joins every variant and
 * collapses line breaks, so a candidate's offset indexes text no file contains.
 * A phrase is found by matching its WORDS against the source instead: case
 * ignored, any run of whitespace between words (the author's line breaks are
 * theirs), never inside a longer word, first match. That is the rule Chord
 * Writer's `WorldPhraseLocator` applies (ADR-321 D17, AC-18), with one
 * difference: this search is clipped to the passage's own columns, and it has
 * no fallback. A phrase it cannot find gets no span at all, and a consumer that
 * wants somewhere to go keeps its own fallback.
 *
 * Lines and columns count the way Chord's lexer counts them: lines split on any
 * of `\r\n`, `\n`, `\r`; a column is a 1-based UTF-16 index into its line; and
 * a span's `endColumn` is just past its last character (`@sharpee/chord`'s `Span`).
 *
 * Public interface: SourceReader, locatePhrase.
 *
 * Owner context: @sharpee/world-index — the derivation package. Pure: it reads
 * no file; `analyze.ts` builds the reader.
 *
 * @packageDocumentation
 * @see ADR-321 D17, AC-18: a phrase is resolved inside its passage
 */

import type { Span } from '@sharpee/chord';

/**
 * The story's source, one file at a time.
 *
 * Keyed the way a `Span` names its file: `undefined` is the main `.story` file,
 * and any other value is a path relative to the main file's directory.
 *
 * @param file the span's `file`, or undefined for the main file
 * @returns that file's whole text, or null when it cannot be read
 */
export type SourceReader = (file: string | undefined) => string | null;

/** A character that makes a match part of a longer word, on either side. */
const WORD_CHARACTER = "[\\p{L}\\p{M}\\p{N}_'-]";

/**
 * Escape a word for use inside a regular expression.
 *
 * @param word one word of the phrase
 * @returns the word with every metacharacter escaped
 */
function escapeWord(word: string): string {
  return word.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

/**
 * Find a phrase's words inside one passage of source.
 *
 * Pure. The search runs over the passage's own region only, from `within.column`
 * on its first line to `within.endColumn` on its last, because the same words
 * very often appear elsewhere in the story and a span in another room's
 * description is worse than none.
 *
 * @param source the whole text of the file the passage sits in
 * @param within the passage's span
 * @param words the phrase's words, in order (any casing)
 * @returns the phrase's own span (carrying `within.file` when it has one), or
 *   null when the words are empty, the span lies outside the source, or the
 *   words are not in the region
 */
export function locatePhrase(source: string, within: Span, words: readonly string[]): Span | null {
  const cleaned = words.filter((word) => word.length > 0);
  if (cleaned.length === 0) return null;

  const lines = source.split(/\r\n|\n|\r/);
  if (within.line < 1 || within.endLine < within.line || within.endLine > lines.length) return null;

  // The region, one entry per source line, each with the column its text starts at.
  const pieces: Array<{ line: number; column: number; text: string }> = [];
  for (let line = within.line; line <= within.endLine; line += 1) {
    const raw = lines[line - 1];
    const startColumn = line === within.line ? within.column : 1;
    const endColumn = line === within.endLine ? within.endColumn : raw.length + 1;
    pieces.push({ line, column: startColumn, text: raw.slice(startColumn - 1, Math.max(startColumn - 1, endColumn - 1)) });
  }
  const region = pieces.map((piece) => piece.text).join('\n');

  const pattern = new RegExp(
    `(?<!${WORD_CHARACTER})${cleaned.map(escapeWord).join('\\s+')}(?!${WORD_CHARACTER})`,
    'iu',
  );
  const match = pattern.exec(region);
  if (match === null) return null;

  const start = position(pieces, match.index);
  const last = position(pieces, match.index + match[0].length - 1);
  const span: Span = {
    line: start.line,
    column: start.column,
    endLine: last.line,
    endColumn: last.column + 1,
  };
  if (within.file !== undefined) span.file = within.file;
  return span;
}

/**
 * The source line and column of one index into the joined region.
 *
 * @param pieces the region's lines, in order, as `locatePhrase` built them
 * @param index an index into their `\n`-joined text that falls on a character
 * @returns the 1-based line and column that character sits at
 */
function position(
  pieces: ReadonlyArray<{ line: number; column: number; text: string }>,
  index: number,
): { line: number; column: number } {
  let offset = index;
  for (const piece of pieces) {
    if (offset < piece.text.length) return { line: piece.line, column: piece.column + offset };
    offset -= piece.text.length + 1;
  }
  // Unreachable for an index inside a match: a match never ends on the joining
  // newline, because the pattern's last element is a word.
  const tail = pieces[pieces.length - 1];
  return { line: tail.line, column: tail.column + tail.text.length };
}
