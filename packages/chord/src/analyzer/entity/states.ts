/**
 * states.ts — the block's state set.
 *
 * The entity's states are the merged set the pass-1 symbol carries: its own
 * `states:` line first, then every composed trait's declared set in
 * composition order. A block collection rejected has no symbol, and then
 * the line's own names stand alone.
 *
 * Public interface: statesBuilder.
 * Owner context: @sharpee/chord analyzer (language frontend; browser-safe).
 *
 * References:
 * - ADR-231 ratchet D8 — the merged set; the loader initializes from states[0].
 */
import type { EntityLineBuilder } from './context.js';

export const statesBuilder: EntityLineBuilder = {
  name: 'states',
  requires: [],
  build(decl, entity) {
    entity.states = entity.sym ? entity.sym.states : decl.states.map((s) => s.name);
  },
};
