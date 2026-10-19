/**
 * vehicle.ts — the block's vehicle lines: `movement:`, `carries:`, `drive:`,
 * `commands:`, `stops:`, `direction:`, `pace:`, `destinations:`, `passage:`,
 * `aboard:`, `boarded through:`, the `position` block, and a room's
 * `admits:` line; also the `to outside` exit's host gate.
 *
 * Every line is checked against the movement type's row of the movement
 * table before anything is written: a line the type does not take, a drive
 * it does not take, a command set it does not take, and a required line
 * that is missing are each named by its own code. The draft's `vehicle`
 * slice is written only on a `vehicle` block, and only from lines the table
 * admits, so the loader reads it as true.
 *
 * Public interface: vehicleBuilder.
 * Owner context: @sharpee/chord analyzer (language frontend; browser-safe).
 *
 * References:
 * - ADR-366 D1 — `vehicle` is a kind; `enterable` beside it is refused.
 * - ADR-366 D2 — `carries: in | on`, required without rooms aboard.
 * - ADR-366 D5, D5a–D5d, D5i — the table, each type's lines and sets.
 * - ADR-366 D6 — `admits:` on a room or region, steered vehicles only.
 * - ADR-366 D7 — rooms aboard, the boarding room, the `outside` exit.
 */
import type { CreateDecl, NameRef, VehicleLine } from '../../ast.js';
import type { IRPositionRow, IRVehicle } from '../../ir.js';
import type { Scope } from '../../analyzer.js';
import { MOVEMENT_TABLE, placeIdsOf, vehicleLineOf, type VehicleDecl, type VehicleLineOf } from '../vehicles.js';
import { manifestForMovementType } from '../../manifests/index.js';
import type { EntityBuildContext, EntityDraft, EntityLineBuilder } from './context.js';

/**
 * The line keys a block that is not a vehicle may carry: a room's `admits:`
 * (ADR-366 D6), and the expanse builder's lines — `size:`, `visibility:`,
 * `drift:` on an expanse, `sight:` on a landmark room or an instrument,
 * `seen from afar:` on a landmark room (ADR-376 D2, D6, D10).
 */
const PLACE_LINE_KEYS: ReadonlySet<VehicleLine['key']> = new Set(['admits', 'size', 'visibility', 'drift', 'sight', 'seen-from-afar']);

/** The movement types whose vehicles a room's `admits:` line may name (D6). */
const STEERED: ReadonlySet<string> = new Set(['streets', 'compass']);

export const vehicleBuilder: EntityLineBuilder = {
  name: 'vehicle',
  requires: ['compositions', 'placement', 'exits'],
  build(decl, entity, context) {
    const name = decl.name.words.join(' ');
    const isVehicle = entity.kinds.some((k) => k.name === 'vehicle');
    const isRoom = entity.kinds.some((k) => k.name === 'room');
    const isRegion = entity.kinds.some((k) => k.name === 'region');

    buildAdmits(decl, entity, context, name, isRoom || isRegion);
    checkOutsideExits(decl, context, entity.id);

    const vehicleLines = decl.vehicleLines.filter((l) => !PLACE_LINE_KEYS.has(l.key));
    if (!isVehicle) {
      for (const line of vehicleLines) {
        if (line.key === 'carries') {
          context.diagnostics.error(
            'analysis.carries-not-vehicle',
            `\`carries: ${line.value}\` says how a vehicle carries the player — \`${name}\` is not a vehicle. (Start inventory is \`carries <thing>\`, with no colon.)`,
            line.span,
          );
        } else {
          context.diagnostics.error(
            'analysis.vehicle-line-owner',
            `\`${line.key.replace('-', ' ')}:\` is a vehicle line — \`${name}\` is not \`a vehicle\`.`,
            line.span,
          );
        }
      }
      if (decl.positionBlock) {
        context.diagnostics.error(
          'analysis.vehicle-line-owner',
          `A \`position\` block says where a vehicle is — \`${name}\` is not \`a vehicle\`.`,
          decl.positionBlock.span,
        );
      }
      return;
    }

    const enterable = decl.compositions.find((c) => c.article === null && c.words.join(' ') === 'enterable');
    if (enterable) {
      context.diagnostics.error(
        'analysis.vehicle-already-enterable',
        `\`${name}\` is a vehicle, which is enterable by construction — remove \`enterable\`.`,
        enterable.span,
      );
    }
    for (const key of new Set(vehicleLines.map((l) => l.key))) {
      const same = vehicleLines.filter((l) => l.key === key);
      for (const extra of same.slice(1)) {
        context.diagnostics.error(
          'analysis.vehicle-line-duplicate',
          `\`${name}\` already has a \`${key.replace('-', ' ')}:\` line (line ${same[0].span.line}).`,
          extra.span,
        );
      }
    }

    const movementLine = vehicleLineOf(decl, 'movement');
    if (!movementLine) {
      context.diagnostics.error(
        'analysis.vehicle-missing-movement',
        `\`${name}\` is a vehicle and names no movement type — add \`movement: none | line | streets | compass | flight\`.`,
        decl.span,
      );
      return;
    }
    const movement = movementLine.value;
    // ADR-366 D12, ADR-376 D3: an extension's movement type is admitted only
    // under its `use` line; the row's checks still run so the block is
    // reported once for the line and once for each other fault.
    const contributed = manifestForMovementType(movement);
    if (contributed && !contributed.core && !context.usedExtensions.has(contributed.name)) {
      context.diagnostics.error(
        `analysis.${contributed.name}-needs-use`,
        `\`movement: ${movement}\` is \`use ${contributed.name}\` vocabulary — add \`use ${contributed.name}\` to the story header.`,
        movementLine.span,
      );
    }
    const row = MOVEMENT_TABLE[movement];
    const vehicle: IRVehicle = { movement };

    // Lines outside the type's row, before anything they would set.
    // `commands:` is judged by the drive first (D5i), below.
    for (const line of vehicleLines) {
      if (line.key === 'movement' || line.key === 'carries' || line.key === 'commands') continue;
      if (!row.lines.has(line.key)) {
        context.diagnostics.error(
          'analysis.vehicle-line-not-for-movement',
          `\`${line.key.replace('-', ' ')}:\` is not a line of a \`movement: ${movement}\` vehicle.`,
          line.span,
        );
      }
    }
    if (decl.positionBlock && !row.position) {
      context.diagnostics.error(
        'analysis.vehicle-line-not-for-movement',
        `A \`position\` block belongs to a \`movement: line\` vehicle under \`drive: state\` — \`${name}\` is \`movement: ${movement}\`.`,
        decl.positionBlock.span,
      );
    }

    // D7: rooms aboard, and D2: `carries:` exactly when there are none.
    const aboardLine = row.lines.has('aboard') ? vehicleLineOf(decl, 'aboard') : undefined;
    const boardedLine = row.lines.has('boarded-through') ? vehicleLineOf(decl, 'boarded-through') : undefined;
    const carriesLine = vehicleLineOf(decl, 'carries');
    if (aboardLine) {
      const aboard = placeIdsOf(aboardLine.names, (ref) => context.resolveEntityId(ref));
      vehicle.aboard = aboard;
      if (carriesLine) {
        context.diagnostics.error(
          'analysis.carries-with-aboard',
          `\`${name}\` has rooms aboard, so the player is never in or on the vehicle itself — remove \`carries: ${carriesLine.value}\`.`,
          carriesLine.span,
        );
      }
      const openable = decl.compositions.find((c) => c.article === null && c.words.join(' ') === 'openable');
      if (openable) {
        context.diagnostics.error(
          'analysis.vehicle-aboard-openable',
          `\`${name}\` has rooms aboard, so it is never opened — its hatch is a door with its own \`openable\`. Remove \`openable\` here.`,
          openable.span,
        );
      }
      if (!boardedLine) {
        context.diagnostics.error(
          'analysis.aboard-without-boarding-room',
          `\`${name}\` has rooms aboard and names no boarding room — add \`boarded through: <one of them>\`.`,
          aboardLine.span,
        );
      } else {
        const boarded = context.resolveEntityId(boardedLine.name);
        if (boarded !== null) {
          if (!aboard.includes(boarded)) {
            context.diagnostics.error(
              'analysis.boarding-room-not-aboard',
              `\`${boardedLine.name.words.join(' ')}\` is not one of the rooms \`${name}\` lists aboard.`,
              boardedLine.span,
            );
          } else {
            vehicle.boardedThrough = boarded;
          }
        }
      }
    } else {
      if (boardedLine) {
        context.diagnostics.error(
          'analysis.boarding-room-not-aboard',
          `\`boarded through:\` names one of the rooms aboard — \`${name}\` lists none. Add \`aboard: <room>, …\`, or remove the line.`,
          boardedLine.span,
        );
      }
      if (!carriesLine) {
        context.diagnostics.error(
          'analysis.vehicle-missing-carries',
          `\`${name}\` says nothing about how it carries the player — add \`carries: in\` or \`carries: on\`.`,
          decl.span,
        );
      } else {
        vehicle.carries = carriesLine.value;
      }
    }

    // D5: the drive, required on every type but `none`.
    const driveLine = vehicleLineOf(decl, 'drive');
    let drive = driveLine?.value ?? null;
    if (movement === 'none') {
      if (driveLine) {
        context.diagnostics.error(
          'analysis.vehicle-drive-not-moving',
          `\`${name}\` is \`movement: none\`, so nothing drives it — remove \`drive: ${driveLine.value}\`.`,
          driveLine.span,
        );
        drive = null;
      }
    } else if (!driveLine) {
      context.diagnostics.error(
        'analysis.vehicle-missing-drive',
        `\`${name}\` moves and says nothing about what drives it — add \`drive: ${[...row.drives].join(' | ')}\`.`,
        decl.span,
      );
    } else if (!row.drives.has(driveLine.value)) {
      context.diagnostics.error(
        'analysis.vehicle-drive-not-for-movement',
        `\`drive: ${driveLine.value}\` is not a drive of a \`movement: ${movement}\` vehicle — one of ${[...row.drives].map((d) => `\`${d}\``).join(', ')}.`,
        driveLine.span,
      );
      drive = null;
    } else {
      vehicle.drive = driveLine.value;
    }

    // D5i: the player's command sets, exactly under `drive: player`.
    const commandsLine = vehicleLineOf(decl, 'commands');
    if (drive === 'player') {
      if (!commandsLine) {
        context.diagnostics.error(
          'analysis.vehicle-missing-commands',
          `\`${name}\` is driven by the player and names no command set — add \`commands: ${[...row.sets].join(' | ')}\`.`,
          driveLine!.span,
        );
      } else {
        const sets: string[] = [];
        for (const set of commandsLine.sets) {
          if (!row.sets.has(set.word)) {
            context.diagnostics.error(
              'analysis.commands-not-for-movement',
              `\`${set.word}\` is not a command set of a \`movement: ${movement}\` vehicle — one of ${[...row.sets].map((s) => `\`${s}\``).join(', ')}.`,
              set.span,
            );
          } else if (!sets.includes(set.word)) {
            sets.push(set.word);
          }
        }
        vehicle.commands = sets;
      }
    } else if (commandsLine) {
      context.diagnostics.error(
        'analysis.commands-not-player-driven',
        `\`commands:\` names what the player may command — \`${name}\` is ${drive ? `\`drive: ${drive}\`` : 'not player-driven'}. Remove the line, or write \`drive: player\`.`,
        commandsLine.span,
      );
    }

    // The type's own lines.
    const paceLine = row.lines.has('pace') ? vehicleLineOf(decl, 'pace') : undefined;
    if (paceLine) vehicle.pace = paceLine.turns;
    switch (movement) {
      case 'line':
        buildLine(decl, context, name, vehicle, drive, paceLine, entity.scope);
        break;
      case 'compass':
        if (!paceLine) {
          context.diagnostics.error(
            'analysis.vehicle-missing-pace',
            `\`${name}\` moves on its heading and says nothing about how fast — add \`pace: <n> turns\`.`,
            decl.span,
          );
        }
        break;
      case 'flight':
        buildFlight(decl, context, name, vehicle);
        break;
      case 'open':
        buildOpen(decl, context, name, vehicle, paceLine);
        break;
      case 'none':
      case 'streets':
        break;
    }

    entity.vehicle = vehicle;
  },
};

/**
 * The open vehicle's own lines (ADR-376 D3, D6): `pace:`, `stride:`,
 * `sight:` and `seen from afar:`, each required, and a placement `in
 * <expanse> at <x>, <y>` (the coordinates themselves are the expanse
 * builder's check, shared with floating things).
 */
function buildOpen(
  decl: CreateDecl,
  context: EntityBuildContext,
  name: string,
  vehicle: IRVehicle,
  paceLine: VehicleLineOf<'pace'> | undefined,
): void {
  if (!paceLine) {
    context.diagnostics.error(
      'analysis.vehicle-missing-pace',
      `\`${name}\` moves across an expanse and says nothing about how often — add \`pace: <n> turns\`.`,
      decl.span,
    );
  }
  const strideLine = vehicleLineOf(decl, 'stride');
  if (!strideLine) {
    context.diagnostics.error(
      'analysis.open-missing-stride',
      `\`${name}\` says nothing about how far a step goes — add \`stride: <n> units\`.`,
      decl.span,
    );
  } else {
    vehicle.stride = strideLine.units;
  }
  const sightLine = vehicleLineOf(decl, 'sight');
  if (!sightLine) {
    context.diagnostics.error(
      'analysis.open-missing-sight',
      `\`${name}\` says nothing about how far one sees from it — add \`sight: <n>\`.`,
      decl.span,
    );
  } else {
    vehicle.sight = sightLine.value;
  }
  const afarLine = vehicleLineOf(decl, 'seen-from-afar');
  if (!afarLine) {
    context.diagnostics.error(
      'analysis.missing-seen-from-afar',
      `\`${name}\` can be seen across an expanse and says nothing of how it looks from there — add \`seen from afar: <text>\`.`,
      decl.span,
    );
  } else {
    vehicle.seenFromAfar = afarLine.text;
  }
  const placed = decl.placement ? context.resolveEntityIdSilent(decl.placement.place) : null;
  if (placed === null || !context.expanses.has(placed)) {
    context.diagnostics.error(
      'analysis.open-not-in-expanse',
      `\`${name}\` is \`movement: open\` and must start in an expanse — ${decl.placement ? `\`${decl.placement.place.words.join(' ')}\` is not one` : 'it has no \`in\` line'}. Write \`in <expanse> at <x>, <y>\`.`,
      decl.placement?.span ?? decl.span,
    );
  }
}

/**
 * `admits: <vehicle>, …` (D6) on a room or a region; a group's line has
 * already been copied to each room it creates.
 */
function buildAdmits(decl: CreateDecl, entity: EntityDraft, context: EntityBuildContext, name: string, isPlace: boolean): void {
  const lines = decl.vehicleLines.filter((l): l is VehicleLineOf<'admits'> => l.key === 'admits');
  if (lines.length === 0) return;
  if (!isPlace) {
    context.diagnostics.error(
      'analysis.admits-owner',
      `\`admits:\` says which vehicles may enter a room — \`${name}\` is not a room, a \`rooms\` group or a region.`,
      lines[0].span,
    );
    return;
  }
  const admits: string[] = [];
  for (const line of lines) {
    for (const ref of line.names) {
      const id = context.resolveEntityId(ref);
      if (id === null) continue;
      const vehicle = context.vehicles.get(id);
      if (!vehicle || !vehicle.movement || !STEERED.has(vehicle.movement)) {
        context.diagnostics.error(
          'analysis.admits-not-steered-vehicle',
          `\`${ref.words.join(' ')}\` is not a steered vehicle — \`admits:\` lists \`movement: streets\` and \`movement: compass\` vehicles, the ones that choose where to go. A line's stops and a flight's destinations admit it by being named.`,
          ref.span,
        );
        continue;
      }
      if (!admits.includes(id)) admits.push(id);
    }
  }
  entity.admits = admits;
}

/** `<direction> to outside` (D7) is legal only in a room some vehicle lists aboard. */
function checkOutsideExits(decl: CreateDecl, context: EntityBuildContext, roomId: string): void {
  const outside = decl.exits.filter((e) => e.toOutside);
  if (outside.length === 0) return;
  const host = [...context.vehicles.values()].find((v) =>
    placeIdsOf(v.aboard, (ref) => context.resolveEntityIdSilent(ref)).includes(roomId),
  );
  if (host) return;
  for (const exit of outside) {
    context.diagnostics.error(
      'analysis.outside-not-aboard',
      `\`${exit.direction} to outside\` leads out of a vehicle — no vehicle lists \`${decl.name.words.join(' ')}\` aboard. Add it to a vehicle's \`aboard:\` line, or name the room the exit leads to.`,
      exit.span,
    );
  }
}

/** The line's own lines (D5a): stops, direction, and the drive's `position` block or `pace:`. */
function buildLine(
  decl: CreateDecl,
  context: EntityBuildContext,
  name: string,
  vehicle: IRVehicle,
  drive: VehicleDecl['drive'],
  paceLine: VehicleLineOf<'pace'> | undefined,
  scope: Scope,
): void {
  const stopsLine = vehicleLineOf(decl, 'stops');
  const stops: string[] = [];
  if (stopsLine) {
    for (const ref of stopsLine.names) {
      const id = context.resolveEntityId(ref);
      if (id === null) continue;
      if (stops.includes(id)) {
        context.diagnostics.error(
          'analysis.line-repeated-stop',
          `\`${ref.words.join(' ')}\` is already a stop of \`${name}\` — a line names each stop once.`,
          ref.span,
        );
        continue;
      }
      stops.push(id);
    }
  }
  if (stops.length < 2) {
    context.diagnostics.error(
      'analysis.line-too-few-stops',
      `A line runs between at least two stops — \`${name}\` ${stopsLine ? `names ${stops.length}` : 'names none'}. Write \`stops: <first>, <second>, …\`.`,
      stopsLine?.span ?? decl.span,
    );
  }
  vehicle.stops = stops;

  const directionLine = vehicleLineOf(decl, 'direction');
  if (!directionLine) {
    context.diagnostics.error(
      'analysis.line-missing-direction',
      `\`${name}\` says nothing about which ways its line runs — add \`direction: both\` or \`direction: one-way\`.`,
      decl.span,
    );
  } else {
    vehicle.direction = directionLine.value;
  }

  // D5: a line vehicle starts at one of its stops.
  const placed = decl.placement ? context.resolveEntityIdSilent(decl.placement.place) : null;
  if (stops.length >= 2 && (placed === null || !stops.includes(placed))) {
    context.diagnostics.error(
      'analysis.vehicle-not-at-stop',
      `\`${name}\` must start at one of its stops — ${decl.placement ? `\`${decl.placement.place.words.join(' ')}\` is not one` : 'it has no \`in\` line'}.`,
      decl.placement?.span ?? decl.span,
    );
  }

  if (drive === 'state') {
    if (paceLine) {
      context.diagnostics.error(
        'analysis.vehicle-line-not-for-movement',
        `\`pace:\` is how often a \`drive: control\` line steps — \`${name}\` is \`drive: state\`, so its \`position\` block decides where it is.`,
        paceLine.span,
      );
      delete vehicle.pace;
    }
    if (!decl.positionBlock) {
      context.diagnostics.error(
        'analysis.state-without-position',
        `\`${name}\` is \`drive: state\` and has no \`position\` block — add \`position … end position\` saying where it is.`,
        decl.span,
      );
    } else {
      vehicle.position = buildPosition(decl, context, name, vehicle, stops, scope);
    }
  } else if (drive === 'control') {
    if (decl.positionBlock) {
      context.diagnostics.error(
        'analysis.position-without-state',
        `A \`position\` block says where a \`drive: state\` line is — \`${name}\` is \`drive: control\`, moved by \`start\` and \`stop\`. Remove the block, or write \`drive: state\`.`,
        decl.positionBlock.span,
      );
    }
    if (!paceLine) {
      context.diagnostics.error(
        'analysis.vehicle-missing-pace',
        `\`${name}\` steps along its line and says nothing about how fast — add \`pace: <n> turns\`.`,
        decl.span,
      );
    }
  }
}

/** The `position` block's rows (D5a), each naming a stop, in a one-way line's order. */
function buildPosition(
  decl: CreateDecl,
  context: EntityBuildContext,
  name: string,
  vehicle: IRVehicle,
  stops: string[],
  scope: Scope,
): IRVehicle['position'] {
  const block = decl.positionBlock!;
  const rows: IRPositionRow[] = [];
  let furthest = -1;
  const stopOf = (ref: NameRef, span: { line: number }): string | null => {
    const id = context.resolveEntityId(ref);
    if (id === null) return null;
    const index = stops.indexOf(id);
    if (index === -1) {
      context.diagnostics.error(
        'analysis.not-a-stop',
        `\`${ref.words.join(' ')}\` is not a stop of \`${name}\`.`,
        ref.span,
      );
      return null;
    }
    if (vehicle.direction === 'one-way' && index < furthest) {
      context.diagnostics.error(
        'analysis.position-against-direction',
        `\`${name}\` runs one way, and this row (line ${span.line}) names a stop behind an earlier row's — a one-way line never runs back.`,
        ref.span,
      );
    }
    furthest = Math.max(furthest, index);
    return id;
  };
  for (const row of block.rows) {
    const stop = stopOf(row.stop, row.span);
    const condition = context.resolveCondition(row.condition, scope);
    if (stop !== null) rows.push({ condition, stop });
  }
  if (!block.otherwise) {
    context.diagnostics.error(
      'analysis.position-no-otherwise',
      `The \`position\` block of \`${name}\` has no \`otherwise: <stop>\` row — the last row says where it is when no \`when\` holds.`,
      block.span,
    );
    return { rows, otherwise: '' };
  }
  const otherwise = stopOf(block.otherwise.stop, block.otherwise.span) ?? '';
  return { rows, otherwise };
}

/** The flight's own lines (D5d): destinations and the passage. */
function buildFlight(decl: CreateDecl, context: EntityBuildContext, name: string, vehicle: IRVehicle): void {
  const destinationsLine = vehicleLineOf(decl, 'destinations');
  const destinations = destinationsLine ? placeIdsOf(destinationsLine.names, (ref) => context.resolveEntityId(ref)) : [];
  const unique = [...new Set(destinations)];
  if (unique.length < 2) {
    context.diagnostics.error(
      'analysis.flight-too-few-destinations',
      `A flight vehicle flies between at least two destinations — \`${name}\` ${destinationsLine ? `names ${unique.length}` : 'names none'}. Write \`destinations: <first>, <second>, …\`.`,
      destinationsLine?.span ?? decl.span,
    );
  }
  vehicle.destinations = unique;
  const passageLine = vehicleLineOf(decl, 'passage');
  if (!passageLine) {
    context.diagnostics.error(
      'analysis.flight-no-passage',
      `\`${name}\` says nothing about how long its passage takes — add \`passage: <n> turns\`.`,
      decl.span,
    );
  } else {
    vehicle.passage = passageLine.turns;
  }
  const placed = decl.placement ? context.resolveEntityIdSilent(decl.placement.place) : null;
  if (unique.length >= 2 && (placed === null || !unique.includes(placed))) {
    context.diagnostics.error(
      'analysis.vehicle-not-at-stop',
      `\`${name}\` must start at one of its destinations — ${decl.placement ? `\`${decl.placement.place.words.join(' ')}\` is not one` : 'it has no \`in\` line'}.`,
      decl.placement?.span ?? decl.span,
    );
  }
}
