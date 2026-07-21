/**
 * diagnostics.ts — Chord compile diagnostics.
 *
 * Purpose: the one diagnostic shape every pipeline stage (lexer, parser,
 * analyzer) reports through. Load-time gates are errors; style advisories
 * are warnings. All carry `.story` spans (ADR-210 AC-3).
 *
 * Public interface: Diagnostic, DiagnosticSeverity, DiagnosticBag.
 * Owner context: @sharpee/chord (language frontend; browser-safe).
 */
import type { Span } from './span.js';

export type DiagnosticSeverity = 'error' | 'warning';

/** One reported problem, anchored to source. */
export interface Diagnostic {
  severity: DiagnosticSeverity;
  /** Stable machine code, e.g. `parse.unterminated-block`. */
  code: string;
  /** Human message. States the problem and, where known, the fix. */
  message: string;
  span: Span;
}

/**
 * Ordered collector for diagnostics.
 * Invariant: `hasErrors()` is true iff at least one 'error' was added —
 * callers gate load success on it (atomic load, ADR-210).
 */
export class DiagnosticBag {
  private items: Diagnostic[] = [];

  /** Append an error diagnostic. */
  error(code: string, message: string, span: Span): void {
    this.items.push({ severity: 'error', code, message, span });
  }

  /** Append a warning diagnostic. */
  warning(code: string, message: string, span: Span): void {
    this.items.push({ severity: 'warning', code, message, span });
  }

  /** All diagnostics in report order. */
  all(): readonly Diagnostic[] {
    return this.items;
  }

  /** True if any error-severity diagnostic was reported. */
  hasErrors(): boolean {
    return this.items.some((d) => d.severity === 'error');
  }
}
