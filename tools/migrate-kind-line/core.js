/**
 * core.js — plans the ADR-359 D1 kind-line migration for one piece of Chord
 * text: every `create` block ends with its kind noun leading the block.
 *
 * Three rules, chosen per block from the parser's AST and applied as text
 * splices at offsets derived from the parser's spans (never a regex over the
 * source):
 *
 *   prepend-thing  the first composition line holds only traits
 *                  (`scenery, plural`) → `a thing, scenery, plural`
 *   insert-line    the block has no composition line → an `a thing` line
 *                  right after the header, at the block's indent
 *   move-kind      the kind is present but not the first item of the first
 *                  composition line → the kind item (with its `with …`
 *                  settings) moves to the front of that line
 *
 * A block already kind-first is untouched, so a second run makes no edits.
 * Blocks the migration must not guess about — two kind nouns, a conditional
 * kind, a kind noun without its article — are left alone and reported.
 *
 * Public interface: planChordText(text) → { blocks, skipped, parseErrors };
 * applyEdits(text, edits) → text; indexLines(text); KIND_RULES.
 * Owner context: tools/ — a one-time corpus migration, outside the
 * published packages.
 */

'use strict';

const path = require('node:path');

const { parse, KIND_NOUNS } = require(path.join(__dirname, '..', '..', 'packages', 'chord', 'dist', 'index.js'));

/** The rule names, in the order a report lists them. */
const KIND_RULES = ['prepend-thing', 'insert-line', 'move-kind'];

/** Default indent for a header-only block when the text has no indented line. */
const FALLBACK_INDENT = '  ';

/**
 * Index the start offset of each line, splitting exactly as the Chord lexer
 * does (`\r\n`, `\n`, `\r`), so a span's (line, column) maps to an offset.
 * @param {string} text
 * @returns {{ starts: number[], ends: number[] }} per-line start offset and
 *   offset of the line's terminator (or text end)
 */
function indexLines(text) {
  const starts = [0];
  const ends = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\r' || ch === '\n') {
      ends.push(i);
      if (ch === '\r' && text[i + 1] === '\n') i++;
      starts.push(i + 1);
    }
  }
  ends.push(text.length);
  return { starts, ends };
}

/**
 * Convert a 1-based (line, column) to an absolute offset.
 * @throws when the position lies outside the text — a span that does not
 *   fit the text it came from means the mapping is wrong, never a no-op.
 */
function offsetOf(lines, line, column) {
  const start = lines.starts[line - 1];
  if (start === undefined) throw new Error(`span line ${line} is outside the text`);
  const offset = start + column - 1;
  if (offset > lines.ends[line - 1]) throw new Error(`span ${line}:${column} is past the end of its line`);
  return offset;
}

/** The leading whitespace of a line. */
function indentOf(text, lines, line) {
  const start = lines.starts[line - 1];
  let i = start;
  while (i < lines.ends[line - 1] && (text[i] === ' ' || text[i] === '\t')) i++;
  return text.slice(start, i);
}

/** The text's first indented non-blank line's indent, for header-only blocks. */
function defaultIndent(text, lines) {
  for (let l = 1; l <= lines.starts.length; l++) {
    const ind = indentOf(text, lines, l);
    if (ind.length > 0 && lines.starts[l - 1] + ind.length < lines.ends[l - 1]) return ind;
  }
  return FALLBACK_INDENT;
}

/**
 * The span of a composition item as [start, end) offsets.
 */
function itemRange(lines, item) {
  return [offsetOf(lines, item.span.line, item.span.column), offsetOf(lines, item.span.endLine, item.span.endColumn)];
}

/**
 * The range to delete when a kind item leaves its line: the item plus one
 * neighbouring comma separator, or the whole line when it was the line's
 * only content.
 */
function removalRange(text, lines, item) {
  const [start, end] = itemRange(lines, item);
  const line = item.span.line;
  const lineStart = lines.starts[line - 1];
  const lineEnd = lines.ends[line - 1];

  // Forward: `<item>, ` — remove through the separator.
  let j = end;
  while (j < lineEnd && text[j] === ' ') j++;
  if (text[j] === ',') {
    j++;
    while (j < lineEnd && text[j] === ' ') j++;
    return [start, j];
  }
  // Backward: `, <item>` at the line's end.
  let i = start;
  while (i > lineStart && text[i - 1] === ' ') i--;
  if (text[i - 1] === ',') {
    i--;
    while (i > lineStart && text[i - 1] === ' ') i--;
    return [i, end];
  }
  // Alone on its line: the whole line goes, with its terminator.
  const rest = text.slice(end, lineEnd).trim();
  if (rest.length !== 0) throw new Error(`unexpected text after the kind item on line ${line}`);
  const nextStart = lines.starts[line];
  if (nextStart !== undefined) return [lineStart, nextStart];
  return [lines.ends[line - 2] ?? lineStart, lineEnd];
}

/**
 * Plan the edits for one create block.
 * @returns {{ rule: string, edits: object[] } | { skip: string } | null}
 *   null when the block is already kind-first
 */
function planBlock(text, lines, decl, indentFallback) {
  const items = decl.compositions;
  const kinds = items.filter((c) => c.article !== null);
  if (kinds.length > 1) return { skip: 'two or more kind nouns' };
  const kind = kinds[0];
  if (kind && kind.condition) return { skip: 'conditional kind' };
  // A kind noun written bare (`scenery, container`) is its own error, with a fix the author chooses.
  if (!kind && items.some((c) => KIND_NOUNS.has(c.words.join(' ').toLowerCase()))) return { skip: 'kind noun without an article' };

  if (items.length === 0) {
    const head = decl.span.line;
    const next = head + 1;
    const indent =
      next <= decl.span.endLine && lines.starts[next - 1] !== undefined ? indentOf(text, lines, next) : indentFallback;
    const at = lines.ends[head - 1];
    const eol = text.slice(lines.ends[head - 1], lines.starts[head] ?? text.length) || '\n';
    return { rule: 'insert-line', edits: [{ at, remove: 0, insert: `${eol}${indent || indentFallback}a thing`, newline: true }] };
  }

  const first = items[0];
  const [firstStart] = itemRange(lines, first);
  if (!kind) {
    return { rule: 'prepend-thing', edits: [{ at: firstStart, remove: 0, insert: 'a thing, ' }] };
  }
  if (kind === first) return null;

  const [kStart, kEnd] = itemRange(lines, kind);
  const kindText = text.slice(kStart, kEnd);
  const [rStart, rEnd] = removalRange(text, lines, kind);
  return {
    rule: 'move-kind',
    edits: [
      { at: firstStart, remove: 0, insert: `${kindText}, ` },
      { at: rStart, remove: rEnd - rStart, insert: '' },
    ],
  };
}

/**
 * Plan the migration of one piece of Chord source.
 * @param {string} text Chord source (a whole `.story`/`.chord` file or an
 *   embedded block)
 * @returns {{ blocks: Array<{rule: string, line: number, name: string, range: number[], edits: object[]}>,
 *   skipped: Array<{reason: string, line: number, name: string}>, parseErrors: number }}
 *   one entry per block that changes; `range` is the block's [start, end)
 *   offsets; edits are non-overlapping { at, remove, insert } splices in
 *   source offsets, and `newline: true` marks an insert that opens a line
 */
function planChordText(text) {
  const { ast, diagnostics } = parse(text);
  const lines = indexLines(text);
  const indentFallback = defaultIndent(text, lines);
  const blocks = [];
  const skipped = [];
  for (const decl of ast.declarations) {
    if (decl.kind !== 'create') continue;
    const name = decl.name.words.join(' ');
    const plan = planBlock(text, lines, decl, indentFallback);
    if (plan === null) continue;
    if (plan.skip) {
      skipped.push({ reason: plan.skip, line: decl.span.line, name });
      continue;
    }
    const range = [lines.starts[decl.span.line - 1], lines.ends[decl.span.endLine - 1]];
    blocks.push({ rule: plan.rule, line: decl.span.line, name, range, edits: plan.edits });
  }
  assertDisjoint(blocks.flatMap((b) => b.edits));
  return { blocks, skipped, parseErrors: diagnostics.filter((d) => d.severity === 'error').length };
}

/** Edits must not overlap; two inserts at one offset would be ambiguous. */
function assertDisjoint(edits) {
  const sorted = [...edits].sort((a, b) => a.at - b.at);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    if (sorted[i].at < prev.at + prev.remove || (sorted[i].at === prev.at && prev.remove === 0 && sorted[i].remove === 0)) {
      throw new Error(`overlapping edits at offset ${sorted[i].at}`);
    }
  }
}

/**
 * Apply splices to text, last offset first so earlier offsets stay valid.
 * @param {string} text
 * @param {Array<{at: number, remove: number, insert: string}>} edits
 * @returns {string}
 */
function applyEdits(text, edits) {
  assertDisjoint(edits);
  let out = text;
  for (const e of [...edits].sort((a, b) => b.at - a.at)) {
    out = out.slice(0, e.at) + e.insert + out.slice(e.at + e.remove);
  }
  return out;
}

module.exports = { planChordText, applyEdits, indexLines, KIND_RULES };
