/**
 * holds.ts — the block's `holds <n>` line: the item capacity of a container
 * or supporter, lowered by the loader to its trait's `capacity.maxItems`.
 *
 * Public interface: holdsBuilder.
 * Owner context: @sharpee/chord analyzer (language frontend; browser-safe).
 *
 * References:
 * - ADR-369 D2 — `holds <n>` is a line, and the one spelling of capacity.
 */
import type { EntityLineBuilder } from './context.js';

/** The kinds whose trait has an item capacity the platform checks. */
const HOLDING_KINDS: ReadonlySet<string> = new Set(['container', 'supporter']);

export const holdsBuilder: EntityLineBuilder = {
  name: 'holds',
  requires: [],
  build(decl, entity, context) {
    const lines = decl.holds;
    if (lines.length === 0) return;
    const kind = decl.compositions.find((c) => c.article !== null)?.words.join(' ') ?? '';
    if (!HOLDING_KINDS.has(kind)) {
      context.diagnostics.error(
        'analysis.holds-owner',
        `\`holds\` bounds what a container or a supporter can hold — \`${decl.name.words.join(' ')}\` is ${kind ? `a ${kind}` : 'neither'}.`,
        lines[0].span,
      );
      return;
    }
    for (const extra of lines.slice(1)) {
      context.diagnostics.error(
        'analysis.holds-duplicate',
        `\`${decl.name.words.join(' ')}\` already says what it holds (line ${lines[0].span.line}).`,
        extra.span,
      );
    }
    entity.holds = lines[0].count;
  },
};
