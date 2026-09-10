/**
 * prose.ts — the block's description and `first time` prose, as phrase keys.
 *
 * The prose itself lives in the phrase table under `<id>.description` and
 * `<id>.initial-description`; the entity carries the key, or null when the
 * block has no such line. Which kinds may carry `first time` prose is the
 * host gate's question, not this builder's.
 *
 * Public interface: proseBuilder.
 * Owner context: @sharpee/chord analyzer (language frontend; browser-safe).
 *
 * References:
 * - Z1 (ADR-211) — `first time` prose compiles to RoomTrait.initialDescription.
 */
import type { EntityLineBuilder } from './context.js';

export const proseBuilder: EntityLineBuilder = {
  name: 'prose',
  requires: [],
  build(decl, entity) {
    entity.descriptionKey = decl.description ? `${entity.id}.description` : null;
    entity.initialDescriptionKey = decl.initialDescription ? `${entity.id}.initial-description` : null;
  },
};
