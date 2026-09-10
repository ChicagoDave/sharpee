/**
 * counters.ts — the block's `counter` lines, one numeric value per instance.
 *
 * Public interface: countersBuilder.
 * Owner context: @sharpee/chord analyzer (language frontend; browser-safe).
 *
 * References:
 * - ADR-264 D1 — per-entity counters.
 */
import type { EntityLineBuilder } from './context.js';

export const countersBuilder: EntityLineBuilder = {
  name: 'counters',
  requires: [],
  build(decl, entity, context) {
    entity.counters = decl.counters.map((c) => context.buildCounterDecl(c));
  },
};
