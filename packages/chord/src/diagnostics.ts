/**
 * diagnostics.ts — Chord compile diagnostics.
 *
 * Purpose: the one diagnostic shape every pipeline stage (lexer, parser,
 * analyzer) reports through. Load-time gates are errors; style advisories
 * are warnings. All carry `.story` spans (ADR-210 AC-3).
 *
 * A diagnostic may carry a `fix`: edits to the source that clear it, which
 * an editor offers to apply (ADR-409 D7.2). The shape is generic; any
 * diagnostic may carry one. An edit that needs a word only the story's
 * language knows (the singular of `houses`) carries a form slot, and the
 * host fills it from that language before the author sees the fix, so
 * chord holds no English.
 *
 * Public interface: Diagnostic, DiagnosticSeverity, DiagnosticFix,
 *   DiagnosticFixEdit, FixFormSlot, FIX_FORM_MARKER, DiagnosticBag.
 * Owner context: @sharpee/chord (language frontend; browser-safe).
 */
import type { Span } from './span.js';

export type DiagnosticSeverity = 'error' | 'warning';

/**
 * Where a slot's filled form goes in an edit's `text` and its fix's
 * `label`: the host replaces it with the form the slot names.
 */
export const FIX_FORM_MARKER = '{form}';

/**
 * A word the story's language fills into a fix (ADR-409 D7.2): the other
 * form of `word`, its singular or its plural. Chord names the word and the
 * form; it never works the form out.
 */
export interface FixFormSlot {
  /** The word whose other form fills the slot, as written: `houses`. */
  word: string;
  /** Which of the word's forms fills it. */
  want: 'singular' | 'plural';
}

/** One replacement in the source: `text` replaces what `span` covers. */
export interface DiagnosticFixEdit {
  span: Span;
  /**
   * The replacement. When `slot` is present it holds {@link FIX_FORM_MARKER}
   * exactly once, where the filled form goes.
   */
  text: string;
  /** Present when the replacement needs a form from the story's language. */
  slot?: FixFormSlot;
}

/** Edits that clear a diagnostic, offered to the author under `label` (ADR-409 D7.2). */
export interface DiagnosticFix {
  /** What applying the fix does. Holds {@link FIX_FORM_MARKER} once per slotted edit, in edit order. */
  label: string;
  edits: readonly DiagnosticFixEdit[];
}

/** One reported problem, anchored to source. */
export interface Diagnostic {
  severity: DiagnosticSeverity;
  /** Stable machine code, e.g. `parse.unterminated-block`. */
  code: string;
  /** Human message. States the problem and, where known, the fix. */
  message: string;
  span: Span;
  /** Edits that clear the diagnostic, when chord knows them. */
  fix?: DiagnosticFix;
}

/**
 * Assert a fix's invariant: at least one edit, a slotted edit's text holds
 * the marker exactly once and an unslotted one's never, and the label holds
 * it once per slotted edit, in edit order.
 * @throws Error when the fix breaks it — a compiler defect, never an author's
 */
function assertFix(code: string, fix: DiagnosticFix): void {
  const count = (s: string) => s.split(FIX_FORM_MARKER).length - 1;
  if (fix.edits.length === 0) throw new Error(`chord: fix on ${code} has no edits`);
  const slotted = fix.edits.filter((e) => e.slot !== undefined);
  for (const edit of fix.edits) {
    const expected = edit.slot ? 1 : 0;
    if (count(edit.text) !== expected) throw new Error(`chord: fix edit on ${code} holds the form marker ${count(edit.text)} times, not ${expected}`);
  }
  if (count(fix.label) !== slotted.length) throw new Error(`chord: fix label on ${code} holds the form marker ${count(fix.label)} times, not once per slotted edit (${slotted.length})`);
}

/**
 * Ordered collector for diagnostics.
 * Invariant: `hasErrors()` is true iff at least one 'error' was added —
 * callers gate load success on it (atomic load, ADR-210).
 */
export class DiagnosticBag {
  private items: Diagnostic[] = [];

  /**
   * Append an error diagnostic.
   * @param fix edits that clear it, when chord knows them
   * @throws Error when `fix` breaks the fix invariant (see {@link DiagnosticFix})
   */
  error(code: string, message: string, span: Span, fix?: DiagnosticFix): void {
    if (fix) {
      assertFix(code, fix);
      this.items.push({ severity: 'error', code, message, span, fix });
    } else {
      this.items.push({ severity: 'error', code, message, span });
    }
  }

  /** Append a warning diagnostic. */
  warning(code: string, message: string, span: Span): void {
    this.items.push({ severity: 'warning', code, message, span });
  }

  /** Append a diagnostic another collector reported, keeping its severity. */
  add(diagnostic: Diagnostic): void {
    this.items.push(diagnostic);
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
