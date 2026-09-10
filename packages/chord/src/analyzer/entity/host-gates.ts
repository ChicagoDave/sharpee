/**
 * host-gates.ts — which lines a block's kind admits.
 *
 * A line that only one kind can carry compiles to nothing on any other, and
 * a silent no-op is what Chord refuses: a door's location is its room pair,
 * a region's is its member list, so neither takes a placement line;
 * `landing` and `containing` are region lines; `first time` prose is a
 * room's; exits, blocked or deadly, leave a room. Each is reported once, at
 * the offending line, and the resolving builders that follow read the kinds
 * without repeating the question. A gate spanning line kinds, so it runs
 * after the compositions it reads and before the lines it governs.
 *
 * Public interface: hostGatesBuilder.
 * Owner context: @sharpee/chord analyzer (language frontend; browser-safe).
 *
 * References:
 * - ADR-234 D3 — no door placement (the loader places it in room1).
 * - ADR-236 D1/D2 — no region placement; `containing` is region-only.
 * - ADR-325 D5 — `landing` is region-only.
 * - Z1 (ADR-211) — `first time` prose is room-only.
 * - ADR-289 D6 — exits are room-only; the loader keeps a defensive throw.
 */
import type { EntityLineBuilder } from './context.js';

export const hostGatesBuilder: EntityLineBuilder = {
  name: 'host-gates',
  requires: ['compositions'],
  build(decl, entity, context) {
    const { kinds } = entity;
    const blockName = decl.name.words.join(' ');
    if (kinds.some((k) => k.name === 'door') && decl.placement) {
      context.diagnostics.error(
        'analysis.door-placement',
        `A door has no placement — its location IS its room pair (the loader places it in the first room of its \`through\` exit line). Remove this line.`,
        decl.placement.span,
      );
    }
    const isRegion = kinds.some((k) => k.name === 'region');
    if (isRegion && decl.placement) {
      context.diagnostics.error(
        'analysis.region-placement',
        `A region has no location — its place IS its member list. Remove this line; membership is \`containing <rooms>\`.`,
        decl.placement.span,
      );
    }
    if (!isRegion && decl.landing) {
      context.diagnostics.error(
        'analysis.landing-host',
        `\`landing\` declares where things put in a region land — \`${blockName}\` is not a region.`,
        decl.landing.span,
      );
    }
    if (!isRegion && decl.containing.length > 0) {
      context.diagnostics.error(
        'analysis.region-containing-host',
        `\`containing\` declares region membership — \`${blockName}\` is not a region. (Contents are placed with \`in\`/\`on\` lines on the contained entity.)`,
        decl.containing[0].span,
      );
    }
    const isRoom = kinds.some((k) => k.name === 'room');
    if (decl.initialDescription && !isRoom) {
      context.diagnostics.error(
        'analysis.first-time-non-room',
        `\`first time\` prose is only supported on rooms (it compiles to RoomTrait.initialDescription) — \`${blockName}\` is not a room.`,
        decl.initialDescription.span,
      );
    }
    if (!isRoom) {
      const strayExit = decl.exits[0] ?? decl.blockedExits[0] ?? decl.deadlyExits[0];
      if (strayExit) {
        context.diagnostics.error(
          'analysis.exit-non-room',
          `Exits belong to rooms — \`${blockName}\` is not a room. Remove the line, or make this block \`a room\`.`,
          strayExit.span,
        );
      }
    }
  },
};
