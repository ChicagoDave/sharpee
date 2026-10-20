/**
 * pushing.ts — the thing's `pushing … end pushing` block: the ways it may be
 * pushed along, as room pairs.
 *
 * Each row's rooms resolve like any entity reference; a `between` row lowers
 * to both directed pairs, a `from … to` row to one. The block on a thing
 * that is not `pushable` is refused here. Whether each pair names a compass
 * exit the first room actually has is the analyzer's whole-graph gate
 * (`checkPushingWays`), which runs once every room's exits are built.
 *
 * Public interface: pushingBuilder.
 * Owner context: @sharpee/chord analyzer (language frontend; browser-safe).
 *
 * References:
 * - ADR-378 D6b — the thing says its own ways; the compiler checks them against the map.
 */
import type { IRPushingWay } from '../../ir.js';
import type { EntityLineBuilder } from './context.js';

export const pushingBuilder: EntityLineBuilder = {
  name: 'pushing',
  requires: ['compositions'],
  build(decl, entity, context) {
    const block = decl.pushingBlock;
    if (!block) return;
    if (!entity.traits.some((t) => t.name === 'pushable')) {
      context.diagnostics.error(
        'analysis.pushing-not-pushable',
        `A \`pushing\` block says where a pushable thing may be pushed — \`${decl.name.words.join(' ')}\` is not \`pushable\`. Compose \`pushable\`, or remove the block.`,
        block.span,
      );
      return;
    }
    const ways: IRPushingWay[] = [];
    for (const row of block.rows) {
      const from = context.resolveEntityId(row.from);
      const to = context.resolveEntityId(row.to);
      if (from === null || to === null) continue;
      ways.push({ from, to, span: row.span });
      if (row.bothWays) ways.push({ from: to, to: from, span: row.span });
    }
    entity.pushing = ways;
  },
};
