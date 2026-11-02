/**
 * vehicles.ts — the vehicle, expanse and aboard-room wiring (pass 2).
 *
 * A vehicle's movement model needs every stop and destination built, an
 * expanse's landmark rows need their rooms, and a room aboard a vehicle
 * needs the rooms the vehicle can be in, so all three are wired in pass 2
 * once every entity exists. The analyzer has already refused every line
 * outside a type's row, so the IR is read as true; each trait's
 * constructor keeps the invariants the analyzer reports first.
 *
 * Public interface: wireVehicle, openVehicleStart, wireExpanse,
 * wireOutsideExits.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-366 D5, D5a–D5d, D5i, D7 — the movement model, the `position`
 *   block, rooms aboard and their computed `to outside` exits.
 * - ADR-375 D4, D5, D7 — the wind, the sailing table, the sails.
 * - ADR-376 D2, D3, D5, D6, D10 — expanses, landmarks, an open vehicle's
 *   start cell.
 */
import { type IREntity, vehicleAboard, vehicleCandidateRoomIds } from '@sharpee/chord';
import {
  AboardTrait,
  AuthorModel,
  ExpanseTrait,
  IFEntity,
  registerVehicleExitResolver,
  VehicleTrait,
  type VehicleMovementConfig,
  WorldModel,
} from '@sharpee/world-model';
import { requireEntity } from '../identity.js';
import type { BuildContext } from './context.js';
import { toDirection } from './wiring.js';

/**
 * ADR-366 D5, D5a–D5d, D5i: the vehicle's movement model, every stop and
 * destination resolved to its world id, and the `position` rows as live
 * guards. The analyzer has already refused every line outside the type's
 * row, so the IR is read as true; the trait's constructor keeps the
 * invariants the analyzer reports first.
 */
export function wireVehicle(story: BuildContext, world: WorldModel, irEntity: IREntity, entity: IFEntity): void {
  const v = irEntity.vehicle!;
  const ids = (list: string[] | undefined) => (list ?? []).map((id) => requireEntity(world, id, irEntity).id);
  let movement: VehicleMovementConfig;
  switch (v.movement) {
    case 'none':
    case 'streets':
      movement = { kind: v.movement };
      break;
    case 'line':
      movement = {
        kind: 'line',
        stops: ids(v.stops),
        oneWay: v.direction === 'one-way',
        drive: v.drive === 'state' ? 'state' : 'control',
        ...(v.pace !== undefined ? { pace: v.pace } : {}),
      };
      break;
    case 'compass':
      movement = { kind: 'compass', drive: v.drive === 'control' ? 'control' : 'player', pace: v.pace ?? 1 };
      break;
    case 'flight':
      movement = {
        kind: 'flight',
        drive: v.drive === 'control' ? 'control' : 'player',
        destinations: ids(v.destinations),
        pace: v.pace ?? 1,
      };
      break;
    case 'open':
      // ADR-376 D3, D5: a position in an expanse, from the placement's
      // `at` tail; null when the vehicle starts in a landmark room, where
      // its location is the one record. `pace:`, `stride:` and `sight:`
      // are required by the analyzer. ADR-375 D5, D7: the sailing table
      // stands in for `pace:`; the sails start in their declared setting.
      movement = {
        kind: 'open',
        drive: v.drive === 'control' ? 'control' : 'player',
        pace: v.pace ?? 1,
        stride: v.stride ?? 1,
        sight: v.sight ?? 0,
        ...(v.seenFromAfar !== undefined ? { seenFromAfar: v.seenFromAfar } : {}),
        position: openVehicleStart(story, world, irEntity, entity),
        ...(v.sailing ? { sailing: { bands: v.sailing.bands.map((b) => ({ from: b.from, to: b.to, paces: b.paces.map((p) => ({ setting: p.setting, pace: p.pace })) })), calm: v.sailing.calm } } : {}),
        ...(v.sails ? { sails: { settings: [...v.sails.settings], current: v.sails.start } } : {}),
      };
      break;
  }
  entity.add(new VehicleTrait({
    movement,
    ...(v.commands !== undefined ? { commands: v.commands } : {}),
    // D7: `boarded through:` is where `enter` and `board` put the player.
    ...(v.boardedThrough !== undefined ? { boardedThrough: requireEntity(world, v.boardedThrough, irEntity).id } : {}),
  }));
  if (v.position) {
    story.vehiclePositions.set(entity.id, {
      rows: v.position.rows.map((row) => ({
        guard: (w: WorldModel) => story.evaluator.evalCondition(row.condition, { world: w, it: irEntity.id }),
        stopId: requireEntity(world, row.stop, irEntity).id,
      })),
      otherwise: requireEntity(world, v.position.otherwise, irEntity).id,
    });
  }
}

/**
 * ADR-376 D3, D5: where an open vehicle starts. Placed `in <expanse> at
 * <x>, <y>` on an open cell, it is in the expanse room at that cell; on a
 * landmark's cell, it is in the landmark's room with no position, since
 * at a landmark the location is the one record. Pass 2 has already placed
 * it in the expanse room; a landmark start moves it on.
 */
export function openVehicleStart(story: BuildContext, world: WorldModel, irEntity: IREntity, entity: IFEntity): { x: number; y: number } | null {
  const at = irEntity.placement?.at;
  if (!at || !irEntity.placement) return null;
  const expanse = story.ir.entities.find((e) => e.id === irEntity.placement!.place)?.expanse;
  const landmark = expanse?.landmarks.find((row) => row.x === at.x && row.y === at.y);
  if (landmark) {
    world.moveEntity(entity.id, requireEntity(world, landmark.room, irEntity).id);
    return null;
  }
  return { x: at.x, y: at.y };
}

/**
 * ADR-376 D2, D6, D10: the expanse's size, each landmark row resolved
 * to its room's world id, the sight cap and the drift interval. Its edges
 * (D8) are its blocked-exit lines, registered as every room's are, and
 * read through the exit message key.
 */
export function wireExpanse(world: WorldModel, irEntity: IREntity, entity: IFEntity): void {
  const x = irEntity.expanse!;
  const landmarks: Record<string, { x: number; y: number }> = {};
  for (const row of x.landmarks) landmarks[requireEntity(world, row.room, irEntity).id] = { x: row.x, y: row.y };
  entity.add(new ExpanseTrait({
    width: x.width,
    height: x.height,
    landmarks,
    ...(x.visibility !== undefined ? { visibility: x.visibility } : {}),
    ...(x.drift !== undefined ? { drift: x.drift } : {}),
    // ADR-375 D4: the wind, a bearing it comes from or a calm.
    ...(x.wind !== undefined ? { wind: x.wind === 'calm' ? 'calm' : x.wind.bearing } : {}),
  }));
}

/**
 * ADR-366 D7: a room some vehicle lists aboard carries AboardTrait, and
 * each of its `to outside` exits is a computed exit whose candidates are
 * the rooms the vehicle can be in — a line's stops, a flight's
 * destinations, or the rooms that admit a steered vehicle. The resolver
 * answers with the vehicle's room on each use. A door on the line is
 * resolved and placed in the room; its room pair is the vehicle's to
 * decide at each use, so no DoorTrait is stamped (the hatch work lands
 * with the rooms-aboard phase).
 */
export function wireOutsideExits(story: BuildContext, world: WorldModel, irEntity: IREntity, entity: IFEntity): void {
  const host = vehicleAboard(story.ir.entities, irEntity.id);
  if (!host) return;
  const outside: Record<string, { candidates: string[]; via?: string }> = {};
  const candidates = vehicleCandidateRoomIds(story.ir.entities, host).map((id) => requireEntity(world, id, host).id);
  for (const exit of irEntity.exits) {
    if (exit.to.kind !== 'outside') continue;
    const direction = toDirection(exit.direction, irEntity);
    const via = exit.via ? requireEntity(world, exit.via, irEntity).id : undefined;
    if (via !== undefined) new AuthorModel(world.getDataStore(), world).moveEntity(via, entity.id);
    outside[direction] = { candidates, ...(via !== undefined ? { via } : {}) };
  }
  entity.add(new AboardTrait({ vehicleId: requireEntity(world, host.id, irEntity).id, outside }));
  registerVehicleExitResolver(world);
}
