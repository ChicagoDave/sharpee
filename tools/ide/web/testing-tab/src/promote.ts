/**
 * promote.ts — turning a span of the story's output into an assertion.
 *
 * Purpose: the whole gesture the editor exists for (Phase 5, R2). Given what a
 *   command printed and the part of it the author selected, this decides which
 *   assertion form the span earns and builds it. The author never learns that an
 *   inline `contains` cannot hold a double quote, never learns the fence is
 *   `text` / `end text` rather than backticks, and never types `end text`.
 *
 *   **Why no normalization happens here.** The runner compares against
 *   `normalizeOutput(actual)` — every line trimmed, then the whole trimmed. It
 *   is tempting to mirror that rule, and wrong: the rule would then live in two
 *   places and could drift. It is unnecessary because the runner normalizes BOTH
 *   sides for the block forms (`normalizeOutput(block.join('\n'))`), so a block
 *   built from raw output lines normalizes to exactly the text being matched;
 *   and the inline form matches its raw value against normalized output, which a
 *   single-line span with its ends trimmed is always a substring of.
 *
 * Public interface: PromotionForm, Promotion, promotionFor.
 * Owner context: tools/ide — the Testing tab's web bundle.
 */

import type { Assertion } from './grammar';

/** Which of R2's forms a span earns. `[STATE:]` is slice 3, from the world. */
export type PromotionForm = 'contains-inline' | 'contains-block' | 'exact';

/** An assertion the editor is ready to write, and how to describe it first. */
export interface Promotion {
  form: PromotionForm;
  /**
   * What the author is told will be written — the assertion tag itself, so the
   * offer and the file agree. A block form says so rather than showing lines.
   */
  label: string;
  /** Why this form and not another, in one clause. Shown beside the offer. */
  because: string;
  assertion: Assertion;
}

/**
 * Chooses the assertion form for a selected span of a command's output.
 *
 * @param output what the command printed, as the wire delivered it
 * @param selection the author's selection within it
 * @returns the promotion, or null when there is nothing to assert — an empty or
 *   whitespace-only selection is a stray click, not a claim.
 */
export function promotionFor(output: string, selection: string): Promotion | null {
  const span = selection.trim();
  if (!span) return null;

  // Selecting everything is the golden gesture: assert the whole response, which
  // is the only form that catches a change the author did not think to look for.
  if (span === output.trim()) {
    return {
      form: 'exact',
      label: '[OK]',
      because: 'the whole response, matched exactly',
      assertion: { type: 'ok', block: lines(span) },
    };
  }

  // An inline fragment is delimited by double quotes, so it cannot hold one.
  // Fernhill is mostly quoted dialogue, which makes this the common case rather
  // than the exotic one — and the block form has no such limit.
  if (span.includes('\n') || span.includes('"')) {
    return {
      form: 'contains-block',
      label: '[OK: contains] + text block',
      because: span.includes('"')
        ? 'the text contains a double quote, which an inline fragment cannot hold'
        : 'the text spans more than one line',
      assertion: { type: 'ok-contains', block: lines(span) },
    };
  }

  return {
    form: 'contains-inline',
    label: `[OK: contains "${span}"]`,
    because: 'a fragment of one line',
    assertion: { type: 'ok-contains', value: span },
  };
}

/**
 * A span as the lines a literal block is written from.
 *
 * Carriage returns are dropped because the runner's normalization drops them
 * too, and a block that differs from the output only by line endings would be a
 * confusing near-miss rather than a clean match.
 */
function lines(span: string): string[] {
  return span.replace(/\r\n/g, '\n').split('\n');
}
