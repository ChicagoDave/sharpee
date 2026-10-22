/**
 * expanse.ts — the expanse's lines and the lines the expanse extension puts
 * on other blocks: `size:`, `visibility:`, `drift:` and the `landmarks`
 * block on an expanse; `sight:` on a landmark room or an instrument; `seen
 * from afar:` on a landmark room; the `at <x>, <y>` tail of a placement in
 * an expanse, on an open vehicle or a floating thing; and the edges, which
 * are the expanse's unconditional blocked-exit lines.
 *
 * Every line is gated on `use expanses`, then on its owner, before anything
 * is written. An open vehicle's own `sight:` and `seen from afar:` are the
 * vehicle builder's; this builder reads them only to know a vehicle wrote
 * them.
 *
 * Public interface: expanseBuilder.
 * Owner context: @sharpee/chord analyzer (language frontend; browser-safe).
 *
 * References:
 * - ADR-376 D1 — every word here needs `use expanses`.
 * - ADR-376 D2 — the expanse: `size:`, the `landmarks` block.
 * - ADR-376 D3, D10 — `in <expanse> at <x>, <y>` on an open vehicle or a floating thing.
 * - ADR-376 D6 — `sight:` and `seen from afar:` on landmark rooms; an instrument's `sight:`; `visibility:`.
 * - ADR-376 D8 — edges are the four sides' blocked-exit lines, never `while`, never an exit.
 * - ADR-376 D10 — `drift:`, required once anything floats.
 */
import type { CreateDecl, VehicleLine } from '../../ast.js';
import type { IRExpanse, IRLandmark } from '../../ir.js';
import type { ExpanseDecl } from '../expanses.js';
import { isKindDecl } from '../declared.js';
import { vehicleLineOf } from '../vehicles.js';
import type { EntityBuildContext, EntityDraft, EntityLineBuilder } from './context.js';

/** The lines an expanse alone carries. */
const EXPANSE_LINE_KEYS: ReadonlySet<VehicleLine['key']> = new Set(['size', 'visibility', 'drift']);

/** The sides an expanse's edge line may name (D8). */
const SIDES: ReadonlySet<string> = new Set(['north', 'south', 'east', 'west']);

/** True when the compositions pass resolved `kind` on this entity. */
function hasKind(entity: EntityDraft, kind: string): boolean {
  return entity.kinds.some((k) => k.name === kind);
}

export const expanseBuilder: EntityLineBuilder = {
  name: 'expanse',
  requires: ['compositions', 'placement', 'exits', 'vehicle'],
  build(decl, entity, context) {
    const name = decl.name.words.join(' ');
    const isExpanse = hasKind(entity, 'expanse');
    const isRoom = hasKind(entity, 'room');
    const isThing = hasKind(entity, 'thing');
    const isVehicle = hasKind(entity, 'vehicle');
    const expanseLines = decl.vehicleLines.filter((l) => EXPANSE_LINE_KEYS.has(l.key));
    const sightLine = vehicleLineOf(decl, 'sight');
    const afarLine = vehicleLineOf(decl, 'seen-from-afar');

    // D1: the gate. `an expanse` itself is reported by the kind-noun check;
    // `movement: open` by the vehicle builder; everything else here.
    if (!context.usedExtensions.has('expanses')) {
      const offending =
        expanseLines[0]?.span ??
        decl.landmarksBlock?.span ??
        (!isVehicle ? sightLine?.span ?? afarLine?.span : undefined) ??
        decl.placement?.at?.span;
      if (offending) {
        context.diagnostics.error(
          'analysis.expanses-needs-use',
          `\`${name}\` writes \`use expanses\` vocabulary — add \`use expanses\` to the story header.`,
          offending,
        );
      }
      return;
    }

    if (isExpanse) {
      entity.expanse = buildExpanse(decl, entity, context, name);
    } else {
      for (const line of expanseLines) {
        context.diagnostics.error(
          'analysis.expanse-line-owner',
          `\`${line.key}:\` is a line of an expanse — \`${name}\` is not \`an expanse\`.`,
          line.span,
        );
      }
      if (decl.landmarksBlock) {
        context.diagnostics.error(
          'analysis.landmarks-owner',
          `A \`landmarks\` block names the rooms an expanse holds — \`${name}\` is not \`an expanse\`.`,
          decl.landmarksBlock.span,
        );
      }
    }

    // D6: `sight:` on a landmark room (its outlook) or a thing (an instrument).
    if (sightLine && !isVehicle) {
      if (isRoom || isThing) {
        entity.sight = sightLine.value;
      } else {
        context.diagnostics.error(
          'analysis.sight-owner',
          `\`sight:\` is how far a vehicle, a landmark room or an instrument sees — \`${name}\` is none of those.`,
          sightLine.span,
        );
      }
    }

    // D6: `seen from afar:` on a landmark room, required there.
    if (afarLine && !isVehicle) {
      if (isRoom) {
        entity.seenFromAfar = afarLine.text;
      } else {
        context.diagnostics.error(
          'analysis.seen-from-afar-owner',
          `\`seen from afar:\` is what a landmark room or an open vehicle shows from a distance — \`${name}\` is neither.`,
          afarLine.span,
        );
      }
    }
    if (isRoom && !afarLine) {
      const host = [...context.expanses.values()].find((e) => e.landmarks.some((row) => context.resolveEntityIdSilent(row.room) === entity.id));
      if (host) {
        context.diagnostics.error(
          'analysis.missing-seen-from-afar',
          `\`${name}\` is a landmark of \`${host.name}\` and says nothing of how it looks from a distance — add \`seen from afar: <text>\`.`,
          decl.span,
        );
      }
    }

    checkPlacement(decl, entity, context, name);
  },
};

/** The expanse's own lines (D2, D6, D8, D10). */
function buildExpanse(decl: CreateDecl, entity: EntityDraft, context: EntityBuildContext, name: string): IRExpanse {
  const sizeLine = vehicleLineOf(decl, 'size');
  if (!sizeLine) {
    context.diagnostics.error(
      'analysis.expanse-missing-size',
      `\`${name}\` is an expanse and says nothing about its extent — add \`size: <width> by <height>\`.`,
      decl.span,
    );
  }
  const width = sizeLine?.width ?? 0;
  const height = sizeLine?.height ?? 0;
  const landmarks: IRLandmark[] = [];
  for (const row of decl.landmarksBlock?.rows ?? []) {
    const id = context.resolveEntityId(row.room);
    if (id === null) continue;
    const roomName = row.room.words.join(' ');
    const landmark = context.byId.get(id)?.decl;
    if (!landmark || !isKindDecl(landmark, 'room') || id === entity.id) {
      context.diagnostics.error(
        'analysis.landmark-not-room',
        `\`${roomName}\` is not a room — a landmark is a room the expanse holds at its coordinates.`,
        row.span,
      );
      continue;
    }
    if (landmarks.some((l) => l.room === id)) {
      context.diagnostics.error(
        'analysis.landmark-duplicate',
        `\`${roomName}\` is already a landmark of \`${name}\` — each room is placed once.`,
        row.span,
      );
      continue;
    }
    if (sizeLine && (row.x >= width || row.y >= height)) {
      context.diagnostics.error(
        'analysis.landmark-outside-expanse',
        `\`${roomName}\` at ${row.x}, ${row.y} lies outside \`${name}\`, which is ${width} by ${height} (coordinates run 0 to ${width - 1} east and 0 to ${height - 1} north).`,
        row.span,
      );
      continue;
    }
    landmarks.push({ room: id, x: row.x, y: row.y });
  }

  // D8: edges are the four sides' unconditional blocked-exit lines, and the
  // expanse is left only at a landmark, so nothing else leads out of it.
  for (const blocked of entity.blockedExits) {
    if (!SIDES.has(blocked.direction)) {
      context.diagnostics.error(
        'analysis.expanse-exit',
        `\`${blocked.direction}\` is not a side of an expanse — an edge is \`north\`, \`south\`, \`east\` or \`west\`, and an expanse is left only at a landmark.`,
        blocked.span,
      );
    } else if (blocked.condition !== null) {
      context.diagnostics.error(
        'analysis.edge-while',
        `An edge of \`${name}\` is never open — nothing lies past it, so \`while\` has no reading here. Write \`${blocked.direction} is blocked: <phrase-key>\`.`,
        blocked.span,
      );
    }
  }
  for (const exit of entity.exits) {
    context.diagnostics.error(
      'analysis.expanse-exit',
      `An expanse has no exits — it is left only at a landmark. Remove \`${exit.direction} to …\` from \`${name}\`, or place the destination as a landmark.`,
      exit.span,
    );
  }

  const visibility = vehicleLineOf(decl, 'visibility');
  const drift = vehicleLineOf(decl, 'drift');
  return {
    width,
    height,
    landmarks,
    ...(visibility ? { visibility: visibility.value } : {}),
    ...(drift ? { drift: drift.turns } : {}),
  };
}

/**
 * A placement in an expanse (D2, D3, D10): only an open vehicle or a
 * floating thing may be there, each with `at <x>, <y>` inside the size; a
 * floating thing needs the expanse to drift.
 */
function checkPlacement(decl: CreateDecl, entity: EntityDraft, context: EntityBuildContext, name: string): void {
  const placement = decl.placement;
  if (!placement) return;
  const placeId = context.resolveEntityIdSilent(placement.place);
  const expanse: ExpanseDecl | undefined = placeId !== null ? context.expanses.get(placeId) : undefined;
  const floats = entity.traits.some((t) => t.name === 'floats');
  const open = context.vehicles.get(entity.id)?.movement === 'open';
  const placeName = placement.place.words.join(' ');
  if (placement.at) {
    if (!expanse) {
      context.diagnostics.error(
        'analysis.at-not-expanse',
        `\`at ${placement.at.x}, ${placement.at.y}\` places \`${name}\` at coordinates — \`${placeName}\` is not an expanse.`,
        placement.at.span,
      );
      return;
    }
    if (!open && !floats) {
      context.diagnostics.error(
        'analysis.expanse-not-open-vehicle',
        `Only a \`movement: open\` vehicle or a thing that \`floats\` may be in an expanse — \`${name}\` is neither.`,
        placement.span,
      );
    }
    if (expanse.size && (placement.at.x >= expanse.size.width || placement.at.y >= expanse.size.height)) {
      context.diagnostics.error(
        'analysis.coordinates-outside-expanse',
        `${placement.at.x}, ${placement.at.y} lies outside \`${expanse.name}\`, which is ${expanse.size.width} by ${expanse.size.height}.`,
        placement.at.span,
      );
    }
    if (floats && !open && !expanse.drifts) {
      context.diagnostics.error(
        'analysis.floats-without-drift',
        `\`${name}\` floats in \`${expanse.name}\`, which says nothing about drift — add \`drift: 1 unit every <n> turns\` to the expanse.`,
        placement.span,
      );
    }
  } else if (expanse) {
    if (open || floats) {
      context.diagnostics.error(
        'analysis.placement-missing-at',
        `\`${name}\` is in \`${expanse.name}\` and names no coordinates — write \`in ${placement.place.article ? `${placement.place.article} ` : ''}${placeName} at <x>, <y>\`.`,
        placement.span,
      );
    } else {
      context.diagnostics.error(
        'analysis.expanse-not-open-vehicle',
        `Only a \`movement: open\` vehicle or a thing that \`floats\` may be in an expanse — \`${name}\` is neither.`,
        placement.span,
      );
    }
  }
}
