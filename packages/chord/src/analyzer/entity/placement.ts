/**
 * placement.ts — where the entity and its holdings start: the `in`/`on`
 * placement line, `wears`, `carries`, a region's `containing` members, and
 * its `landing`.
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
 * - ADR-236 D2/D3 — `containing` is region membership, additive across lines.
 * - ADR-325 D5 — a region's `landing`.
 */
import type { EntityLineBuilder } from './context.js';

export const placementBuilder: EntityLineBuilder = {
  name: 'placement',
  requires: ['compositions'],
  build(decl, entity, context) {
    entity.placement = decl.placement
      ? {
          relation: decl.placement.relation,
          place: context.resolveEntityId(decl.placement.place) ?? '',
          span: decl.placement.span,
        }
      : null;
    entity.wears = decl.wears.map((w) => context.resolveEntityId(w) ?? '').filter((w) => w !== '');
    entity.carries = decl.carries.map((c) => context.resolveEntityId(c) ?? '').filter((c) => c !== '');
    entity.containing = decl.containing
      .map((m) => ({ id: context.resolveEntityId(m) ?? '', span: m.span }))
      .filter((m) => m.id !== '');
    const isRegion = entity.kinds.some((k) => k.name === 'region');
    if (decl.landing && isRegion) entity.landing = context.buildLanding(decl.landing);
  },
};
