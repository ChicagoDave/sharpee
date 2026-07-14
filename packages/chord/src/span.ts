/**
 * span.ts — source positions and spans for Chord AST nodes and diagnostics.
 *
 * Purpose: every AST node and diagnostic carries a Span so load-time gates
 * report `.story` line numbers (ADR-210 AC-3) and the IR keeps source spans.
 *
 * Public interface: Span, spanOf(), mergeSpans().
 * Owner context: @sharpee/chord (language frontend; browser-safe).
 */

/** A half-open region of `.story` source. Lines and columns are 1-based. */
export interface Span {
  /** 1-based line of the first character. */
  line: number;
  /** 1-based column of the first character. */
  column: number;
  /** 1-based line of the last character (inclusive). */
  endLine: number;
  /** 1-based column just past the last character. */
  endColumn: number;
}

/**
 * Build a single-line span.
 * @param line 1-based line number
 * @param column 1-based start column
 * @param length character count (defaults to 1)
 */
export function spanOf(line: number, column: number, length = 1): Span {
  return { line, column, endLine: line, endColumn: column + length };
}

/** The smallest span covering both `a` and `b`. */
export function mergeSpans(a: Span, b: Span): Span {
  const startFirst = a.line < b.line || (a.line === b.line && a.column <= b.column) ? a : b;
  const endLast = a.endLine > b.endLine || (a.endLine === b.endLine && a.endColumn >= b.endColumn) ? a : b;
  return {
    line: startFirst.line,
    column: startFirst.column,
    endLine: endLast.endLine,
    endColumn: endLast.endColumn,
  };
}
