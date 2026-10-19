/**
 * placement.ts — where the entity and its holdings start: the `in`/`on`
 * placement line, `wears`, `carries`, and a region's `landing`. A room's
 * `in the <region>` line is resolved here like any placement; the analyzer
 * turns it into region membership once every entity is built.
 *
 * Every name resolves like any entity reference; an unresolved one is the
 * standard unknown-entity error, and the entry is dropped ('' for the
 * placement itself, so the loader sees no place). A landing is written only
 * on a region, and only when the block declares one. Which kinds admit
 * which of these lines is the host gate's question.
 *
 * Public interface: placementBuilder.
 * Owner context: @sharpee/chord analyzer (language frontend; browser-safe).
 *
 * References:
 * - ADR-230 Phase 6 — `carries` beside `wears`.
 * - ADR-360 D4 — a room joins a region with `in the <region>`.
 * - ADR-325 D5 — a region's `landing`.
 * - ADR-374 D2 — a backdrop's list placement.
 */
import type { Placement } from '../../ast.js';
import type { IRPlacement } from '../../ir.js';
import type { EntityLineBuilder, EntityBuildContext } from './context.js';

/**
 * Resolve a placement line. A list (ADR-374 D2) resolves every place. `and`
 * separates places here exactly as it separates names in every Chord name
 * list, so a thing whose name contains `and` is placed into by an alias.
 */
function placementOf(line: Placement, context: EntityBuildContext): IRPlacement {
  // ADR-376 D3: the coordinates tail rides along; the expanse builder gates it.
  const base = { relation: line.relation, ...(line.at ? { at: { x: line.at.x, y: line.at.y } } : {}), span: line.span };
  const place = context.resolveEntityId(line.place) ?? '';
  if (!line.more) return { ...base, place };
  const rest = line.more.map((ref) => context.resolveEntityId(ref) ?? '');
  return { ...base, place, places: [place, ...rest] };
}

export const placementBuilder: EntityLineBuilder = {
  name: 'placement',
  requires: ['compositions'],
  build(decl, entity, context) {
    entity.placement = decl.placement ? placementOf(decl.placement, context) : null;
    entity.wears = decl.wears.map((w) => context.resolveEntityId(w) ?? '').filter((w) => w !== '');
    entity.carries = decl.carries.map((c) => context.resolveEntityId(c) ?? '').filter((c) => c !== '');
    const isRegion = entity.kinds.some((k) => k.name === 'region');
    if (decl.landing && isRegion) entity.landing = context.buildLanding(decl.landing);
  },
};
