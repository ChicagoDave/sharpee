/**
 * servings.ts — the block's `servings <n>` line: how many bites or sips a
 * thing has before it is finished, lowered by the loader to its edible
 * trait's `servings`. The builder refuses a second line and keeps the first.
 * Which blocks may carry the line is not decided here: it is a fact of the
 * finished IR, so `validateIR` owns it (`analysis.servings-owner`).
 *
 * Public interface: servingsBuilder.
 * Owner context: @sharpee/chord analyzer (language frontend; browser-safe).
 *
 * References:
 * - ADR-369 D2 — `holds <n>`, the line this one is built like.
 * - ADR-389 D4 — the IR's invariants have one home, `validateIR`.
 */
import type { EntityLineBuilder } from './context.js';

export const servingsBuilder: EntityLineBuilder = {
  name: 'servings',
  requires: [],
  build(decl, entity, context) {
    const lines = decl.servings;
    if (lines.length === 0) return;
    for (const extra of lines.slice(1)) {
      context.diagnostics.error(
        'analysis.servings-duplicate',
        `\`${decl.name.words.join(' ')}\` already says how many servings it has (line ${lines[0].span.line}).`,
        extra.span,
      );
    }
    entity.servings = lines[0].count;
  },
};
