/**
 * prose.ts — the block's description and `first time` prose, as phrase keys,
 * and where a room's text comes from.
 *
 * The prose itself lives in the phrase table under the keys the analyzer
 * names (`<id>.description` and `<id>.initial-description`, or a `rooms`
 * group's one shared pair, so a group's text is written once); the entity
 * carries the key, or null when the block has no such line. Every room
 * also carries where its description and heading come from — its own block,
 * its group, or nowhere — and a written room block with no description is
 * warned here; a group's missing description is warned once, on its `rooms`
 * line, when the group expands. Which kinds may carry `first time` prose is
 * the host gate's question, not this builder's.
 *
 * Public interface: proseBuilder.
 * Owner context: @sharpee/chord analyzer (language frontend; browser-safe).
 *
 * References:
 * - Z1 (ADR-211) — `first time` prose compiles to RoomTrait.initialDescription.
 * - ADR-360 D7 — a room with no description is a warning, never an error.
 * - ADR-360 D8 — the text sources are computed here, once.
 */
import type { CreateDecl } from '../../ast.js';
import type { IRTextSource } from '../../ir.js';
import type { RoomGroupOrigin } from '../room-groups.js';
import type { EntityLineBuilder } from './context.js';

/**
 * Where one kind of a room's text comes from.
 * @param written the room's own block carries the text
 * @param origin the group that created the room, if any
 */
function textSource(written: boolean, origin: RoomGroupOrigin | undefined): IRTextSource {
  if (!written) return { from: 'none' };
  if (!origin) return { from: 'own' };
  return { from: 'group', regionId: origin.regionId, group: [origin.firstName, origin.lastName] };
}

function hasRoomName(decl: CreateDecl): boolean {
  return decl.phraseOverrides.some((o) => o.key === 'room-name');
}

export const proseBuilder: EntityLineBuilder = {
  name: 'prose',
  requires: ['compositions'],
  build(decl, entity, context) {
    const origin = context.groupOrigins.get(decl);
    const keys = context.descriptionKeysOf(entity.id, decl);
    entity.descriptionKey = decl.description ? keys.description : null;
    entity.initialDescriptionKey = decl.initialDescription ? keys.initialDescription : null;
    if (!entity.kinds.some((k) => k.name === 'room')) return;
    entity.descriptionSource = textSource(decl.description !== null, origin);
    entity.roomNameSource = textSource(hasRoomName(decl), origin);
    if (!decl.description && !origin) {
      context.diagnostics.warning(
        'analysis.room-no-description',
        `\`${[decl.name.article, ...decl.name.words].filter(Boolean).join(' ')}\` has no description, so LOOK there shows only its name.`,
        decl.name.span,
      );
    }
  },
};
