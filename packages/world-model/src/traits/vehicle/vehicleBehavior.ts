/**
 * Vehicle Behavior - the rules a vehicle's movement model decides
 *
 * Public interface: `isVehicle`, `isActorInVehicle`, `getActorVehicle`,
 * `getVehicleOccupants`, `isAboardVehicle`, `getVehicleAboard`,
 * `takesCommandSet` (where an actor rides and what they may say there),
 * `goingFromVehicle` (what GO means from inside), `admitsVehicle`,
 * `isUnderWay`, the driving statements `startVehicle`, `stopVehicle` and
 * `sendVehicle`, the machine's per-turn step `stepVehicle` with its result
 * `VehicleStep`, the line model's `isStop`, `currentStop` and
 * `moveVehicleToStop`, and the rooms-aboard half:
 * `vehicleOutsideExitResolver` and `registerVehicleExitResolver` (an exit
 * `to outside` lands where the vehicle is).
 *
 * Owner context: world-model vehicle behavior. Every answer is read from
 * the world and the trait's model; nothing here keeps a position of its own.
 * Moving a vehicle is `WorldModel.moveEntity`, which carries what the
 * vehicle holds because containment is relational. The stepping functions
 * are the whole of the vehicle's built-in machine: the turn host that calls
 * them once per turn decides nothing about movement.
 *
 * References:
 * - ADR-366 D4 — moving a vehicle moves what it holds.
 * - ADR-366 D5, D5a–D5d — what GO means from inside; what a step is per type.
 * - ADR-366 D5e, D5g — the machine is the vehicle's own; its state is trait data.
 * - ADR-366 D6 — a room admits the steered vehicles it names.
 * - ADR-366 D7 — rooms aboard; `to outside` resolves to the vehicle's room,
 *   and refuses with `vehicle-under-way` while the vehicle is nowhere.
 * - ADR-366 D9 — the vehicle's location is the one fact, read, never copied.
 * - ADR-295 D4 — the exit resolver seam the outside exit rides.
 */

import type { ExitResolver } from '../../capabilities/exit-resolver-binding.js';
import { WorldModel } from '../../world/WorldModel.js';
import { IFEntity } from '../../entities/if-entity.js';
import type { DirectionType } from '../../constants/directions.js';
import { TraitType } from '../trait-types.js';
import { RoomTrait } from '../room/roomTrait.js';
import { RoomBehavior } from '../room/roomBehavior.js';
import { OpenableBehavior } from '../openable/openableBehavior.js';
import { AboardTrait } from './aboardTrait.js';
import { VehicleTrait, VehicleLineModel } from './vehicleTrait.js';

/**
 * Check if an entity is a vehicle
 */
export function isVehicle(entity: IFEntity): boolean {
  return entity.has(TraitType.VEHICLE);
}

/**
 * Check if an actor is currently inside a vehicle
 */
export function isActorInVehicle(world: WorldModel, actorId: string): boolean {
  return getActorVehicle(world, actorId) !== undefined;
}

/**
 * Get the vehicle an actor is in, or undefined if not in a vehicle
 */
export function getActorVehicle(world: WorldModel, actorId: string): IFEntity | undefined {
  const location = world.getLocation(actorId);
  if (!location) return undefined;

  const locationEntity = world.getEntity(location);
  if (!locationEntity) return undefined;

  return isVehicle(locationEntity) ? locationEntity : undefined;
}

/**
 * Get all actors currently inside a vehicle
 */
export function getVehicleOccupants(world: WorldModel, vehicleId: string): IFEntity[] {
  const contents = world.getContents(vehicleId);
  return contents.filter((entity: IFEntity) => entity.has(TraitType.ACTOR));
}

/**
 * What GO means for an actor, decided by the vehicle they are in (D5).
 * `on-foot`: not in a vehicle, GO is walking. `steers`: GO moves the
 * vehicle (the destination still has to admit it, `admitsVehicle`).
 * `rides`: a line vehicle; the player rides and the story drives.
 * `stays`: a vehicle with no movement model does not move under GO.
 */
export type VehicleGoing =
  | { kind: 'on-foot' }
  | { kind: 'steers'; vehicle: IFEntity }
  | { kind: 'rides'; vehicle: IFEntity }
  | { kind: 'stays'; vehicle: IFEntity };

/**
 * Decide what GO means for an actor from where they are.
 *
 * @param world - The world model
 * @param actorId - The actor trying to go
 * @returns on-foot when the actor is not in a vehicle; otherwise the model's answer
 */
export function goingFromVehicle(world: WorldModel, actorId: string): VehicleGoing {
  const vehicle = getActorVehicle(world, actorId);
  if (!vehicle) return { kind: 'on-foot' };

  const model = vehicle.get(VehicleTrait)?.model;
  if (model?.kind === 'streets') return { kind: 'steers', vehicle };
  if (model?.kind === 'line' || model?.kind === 'compass' || model?.kind === 'flight') return { kind: 'rides', vehicle };
  return { kind: 'stays', vehicle };
}

/**
 * Whether a vehicle's machine is moving it (ADR-366 D5e): a line stepping
 * along its stops, a compass vehicle on a heading, a flight vehicle in its
 * passage. A `none` or streets vehicle is never under way.
 *
 * @param vehicle - A vehicle; false when it has no model
 */
export function isUnderWay(vehicle: IFEntity): boolean {
  const model = vehicle.get(VehicleTrait)?.model;
  switch (model?.kind) {
    case 'line':
      return model.underWay;
    case 'compass':
      return model.heading !== null;
    case 'flight':
      return model.destination !== null;
    default:
      return false;
  }
}

/**
 * `start <vehicle> [heading <direction>]` (ADR-366 D5a, D5c, D5f): put the
 * vehicle's machine under way. A line steps from its current stop in its
 * travel direction, turning back at a `both` line's end; a compass vehicle
 * takes the heading. The first step comes after `pace` turns; stepping is
 * the machine's per-turn work.
 *
 * @param world - The world model
 * @param vehicle - A line or compass vehicle
 * @param heading - The heading, for a compass vehicle
 * @returns false when the vehicle cannot start: a one-way line at its end
 *   (`vehicle-at-end`), a compass vehicle with no heading, or a type with no
 *   `start`
 */
export function startVehicle(world: WorldModel, vehicle: IFEntity, heading?: string): boolean {
  const model = vehicle.get(VehicleTrait)?.model;
  if (model?.kind === 'line') {
    const stop = currentStop(world, vehicle);
    const index = stop === undefined ? -1 : model.stops.indexOf(stop);
    if (index === model.stops.length - 1) {
      if (model.oneWay) return false;
      model.travelDirection = 'back';
    } else if (index === 0) {
      model.travelDirection = 'onward';
    }
    model.underWay = true;
    model.turnsToStep = model.pace ?? 1;
    return true;
  }
  if (model?.kind === 'compass') {
    if (heading === undefined) return false;
    model.heading = heading;
    model.turnsToStep = model.pace;
    return true;
  }
  return false;
}

/**
 * `stop <vehicle>` (ADR-366 D5f): take the vehicle's machine out of the way
 * where it is — a line halts at its stop, a compass vehicle loses its heading.
 *
 * @returns false when the type has no `stop`
 */
export function stopVehicle(vehicle: IFEntity): boolean {
  const model = vehicle.get(VehicleTrait)?.model;
  if (model?.kind === 'line') {
    model.underWay = false;
    model.turnsToStep = 0;
    return true;
  }
  if (model?.kind === 'compass') {
    model.heading = null;
    model.turnsToStep = 0;
    return true;
  }
  return false;
}

/**
 * `send <vehicle> to <destination>` (ADR-366 D5d): a flight vehicle leaves
 * its room and is nowhere for the passage, then arrives. The departure and
 * the arrival are the machine's per-turn work; this records where it is
 * bound.
 *
 * @returns false when the vehicle is not a flight vehicle or the room is not
 *   one of its destinations
 */
export function sendVehicle(vehicle: IFEntity, destinationId: string): boolean {
  const model = vehicle.get(VehicleTrait)?.model;
  if (model?.kind !== 'flight' || !model.destinations.includes(destinationId)) return false;
  model.destination = destinationId;
  model.turnsRemaining = model.passage;
  return true;
}

/**
 * The resolver for a room aboard a vehicle (ADR-366 D7): an exit `to
 * outside` leads to the room the vehicle is in, through the door the line
 * named, and is blocked with `vehicle-under-way` while the vehicle is nowhere.
 * Defers to static topology for a direction the trait does not declare.
 */
export const vehicleOutsideExitResolver: ExitResolver = (_room, trait, direction, _staticExit, ctx) => {
  const aboard = trait as AboardTrait;
  const outside = aboard.outside[direction];
  if (!outside) return undefined;
  const vehicle = ctx.world.getEntity(aboard.vehicleId);
  const location = ctx.world.getLocation(aboard.vehicleId);
  if (!vehicle || location === undefined || isUnderWay(vehicle)) {
    return { kind: 'blocked', messageId: 'if.action.going.vehicle_under_way', params: { vehicle: vehicle?.name ?? aboard.vehicleId } };
  }
  return { kind: 'exit', destination: location, ...(outside.via !== undefined ? { via: outside.via } : {}) };
};

/**
 * Register the outside-exit resolver on a world. Idempotent; a story that
 * has rooms aboard a vehicle registers it at load.
 */
export function registerVehicleExitResolver(world: WorldModel): void {
  world.registerExitResolver(AboardTrait.type, vehicleOutsideExitResolver);
}

/**
 * Whether a room admits a vehicle (D6). A room admits no vehicle unless it
 * names it.
 *
 * @param room - The room the vehicle would land in
 * @param vehicle - The vehicle
 */
export function admitsVehicle(room: IFEntity, vehicle: IFEntity): boolean {
  return room.get(RoomTrait)?.admits.includes(vehicle.id) ?? false;
}

function lineOf(vehicle: IFEntity): VehicleLineModel | undefined {
  const model = vehicle.get(VehicleTrait)?.model;
  return model?.kind === 'line' ? model : undefined;
}

/**
 * Whether a room is one of a line vehicle's stops.
 *
 * @param vehicle - A vehicle; false when it has no line model
 * @param roomId - The room to test
 */
export function isStop(vehicle: IFEntity, roomId: string): boolean {
  return lineOf(vehicle)?.stops.includes(roomId) ?? false;
}

/**
 * The stop a line vehicle is at, read from its location (D9).
 *
 * @returns the stop's room id, or undefined when the vehicle has no line or is between stops
 */
export function currentStop(world: WorldModel, vehicle: IFEntity): string | undefined {
  const location = world.getLocation(vehicle.id);
  return location !== undefined && isStop(vehicle, location) ? location : undefined;
}

/**
 * Move a line vehicle, and everything it holds, to one of its stops (D5a).
 *
 * @param world - The world model
 * @param vehicle - A vehicle with a line model
 * @param stopId - The stop to move to
 * @throws when the vehicle has no line or the room is not one of its stops
 */
export function moveVehicleToStop(world: WorldModel, vehicle: IFEntity, stopId: string): void {
  if (!lineOf(vehicle)) {
    throw new Error(`moveVehicleToStop: ${vehicle.id} has no line`);
  }
  if (!isStop(vehicle, stopId)) {
    throw new Error(`moveVehicleToStop: ${stopId} is not a stop of ${vehicle.id}`);
  }
  world.moveEntity(vehicle.id, stopId);
}

/**
 * Whether an entity is aboard a vehicle: inside it at any depth, or in a
 * room aboard it (D7). An actor in a box in the hold is aboard the ship.
 *
 * @param world - The world model
 * @param entityId - The entity to test, usually an actor
 * @param vehicleId - The vehicle
 */
export function isAboardVehicle(world: WorldModel, entityId: string, vehicleId: string): boolean {
  const seen = new Set<string>();
  let current: string | undefined = world.getLocation(entityId);
  while (current !== undefined && !seen.has(current)) {
    if (current === vehicleId) return true;
    seen.add(current);
    const entity = world.getEntity(current);
    const aboard = entity?.get(AboardTrait);
    if (aboard?.vehicleId === vehicleId) return true;
    current = world.getLocation(current);
  }
  return false;
}

/**
 * What one turn of the vehicle's machine did (D5e): it reached a room
 * (`vehicle-arrived`, a stop, the room in its heading, or its destination),
 * it ran out of way and took itself out of the way (`vehicle-stopped`,
 * reported once), or it left its room for the passage (`departed`, which
 * no stock line reports: the fold is the author's sequence on `becomes
 * under way`).
 */
export type VehicleStep =
  | { kind: 'arrived'; roomId: string }
  | { kind: 'stopped' }
  | { kind: 'departed' };

/**
 * One turn of the vehicle's built-in machine (ADR-366 D5e). The types share
 * one machine and differ only in what a step is (D5f): a line steps to the
 * next stop or to where its `position` block says, a compass vehicle steps
 * along the exit in its heading, a flight vehicle leaves, is nowhere for
 * the passage, and arrives. Every move is `WorldModel.moveEntity`, so what
 * the vehicle holds comes along (D4), and every piece of machine state
 * written here is a trait field (D5g).
 *
 * @param world - The world model
 * @param vehicle - A vehicle; nothing happens without a model that moves
 * @param positionAnswer - For a `drive: state` line, the stop its
 *   `position` block names this turn; the caller evaluates the block,
 *   since its guards are code the trait cannot hold. Ignored by every
 *   other model.
 * @returns what the step did, or undefined when the vehicle stayed put
 */
export function stepVehicle(world: WorldModel, vehicle: IFEntity, positionAnswer?: string): VehicleStep | undefined {
  const model = vehicle.get(VehicleTrait)?.model;
  switch (model?.kind) {
    case 'line':
      return model.drive === 'state' ? stepStateLine(world, vehicle, model, positionAnswer) : stepControlLine(world, vehicle, model);
    case 'compass':
      return stepCompass(world, vehicle, model);
    case 'flight':
      return stepFlight(world, vehicle, model);
    default:
      return undefined;
  }
}

/** D5a, `drive: state`: the block's answer differs from where the vehicle is, so it moves there. */
function stepStateLine(world: WorldModel, vehicle: IFEntity, model: VehicleLineModel, positionAnswer: string | undefined): VehicleStep | undefined {
  if (positionAnswer === undefined || !model.stops.includes(positionAnswer)) return undefined;
  if (world.getLocation(vehicle.id) === positionAnswer) return undefined;
  world.moveEntity(vehicle.id, positionAnswer);
  return { kind: 'arrived', roomId: positionAnswer };
}

/**
 * D5a, `drive: control`: every `pace` turns under way, one stop in the
 * travel direction; the machine halts itself at the line's end. A vehicle
 * found off its stops (a `move` the author wrote) halts where it is.
 */
function stepControlLine(world: WorldModel, vehicle: IFEntity, model: VehicleLineModel): VehicleStep | undefined {
  if (!model.underWay) return undefined;
  const stop = currentStop(world, vehicle);
  if (stop === undefined) {
    model.underWay = false;
    model.turnsToStep = 0;
    return { kind: 'stopped' };
  }
  model.turnsToStep -= 1;
  if (model.turnsToStep > 0) return undefined;

  // `startVehicle` turned a `both` line at its end and refused a one-way
  // one, and arriving at an end halts below, so the next stop always exists.
  const index = model.stops.indexOf(stop);
  const nextIndex = model.travelDirection === 'onward' ? index + 1 : index - 1;
  const next = model.stops[nextIndex];
  world.moveEntity(vehicle.id, next);
  const atEnd = nextIndex === 0 || nextIndex === model.stops.length - 1;
  if (atEnd) {
    model.underWay = false;
    model.turnsToStep = 0;
  } else {
    model.turnsToStep = model.pace ?? 1;
  }
  return { kind: 'arrived', roomId: next };
}

/**
 * D5c: every `pace` turns on a heading, one room along the exit that way
 * while the exit exists, no closed door bars it, and the destination admits
 * the vehicle (D6); when it cannot, the heading clears and the vehicle is
 * stopped, once.
 */
function stepCompass(world: WorldModel, vehicle: IFEntity, model: Extract<NonNullable<VehicleTrait['model']>, { kind: 'compass' }>): VehicleStep | undefined {
  if (model.heading === null) return undefined;
  model.turnsToStep -= 1;
  if (model.turnsToStep > 0) return undefined;

  const location = world.getLocation(vehicle.id);
  const room = location !== undefined ? world.getEntity(location) : undefined;
  const exit = room?.has(TraitType.ROOM) ? RoomBehavior.getExit(room, model.heading as DirectionType) : null;
  const destination = exit ? world.getEntity(exit.destination) : undefined;
  const door = exit?.via !== undefined ? world.getEntity(exit.via) : undefined;
  const doorShut = door !== undefined && door.has(TraitType.OPENABLE) && !OpenableBehavior.isOpen(door);
  if (!destination || doorShut || !admitsVehicle(destination, vehicle)) {
    model.heading = null;
    model.turnsToStep = 0;
    return { kind: 'stopped' };
  }
  world.moveEntity(vehicle.id, destination.id);
  model.turnsToStep = model.pace;
  return { kind: 'arrived', roomId: destination.id };
}

/**
 * D5d: bound for a destination, the vehicle leaves its room on the first
 * turn and is nowhere; the passage counts down a turn at a time; at zero
 * it arrives and is no longer under way.
 */
function stepFlight(world: WorldModel, vehicle: IFEntity, model: Extract<NonNullable<VehicleTrait['model']>, { kind: 'flight' }>): VehicleStep | undefined {
  if (model.destination === null) return undefined;
  if (world.getLocation(vehicle.id) !== undefined) {
    world.moveEntity(vehicle.id, null);
    return { kind: 'departed' };
  }
  model.turnsRemaining -= 1;
  if (model.turnsRemaining > 0) return undefined;
  const destination = model.destination;
  world.moveEntity(vehicle.id, destination);
  model.destination = null;
  model.turnsRemaining = 0;
  return { kind: 'arrived', roomId: destination };
}

/**
 * The vehicle an actor is aboard (D7): the vehicle they are inside at any
 * depth, or the vehicle whose room they stand in. Undefined on foot.
 *
 * @param world - The world model
 * @param actorId - The actor
 */
export function getVehicleAboard(world: WorldModel, actorId: string): IFEntity | undefined {
  const seen = new Set<string>();
  let current: string | undefined = world.getLocation(actorId);
  while (current !== undefined && !seen.has(current)) {
    seen.add(current);
    const entity = world.getEntity(current);
    if (!entity) return undefined;
    if (isVehicle(entity)) return entity;
    const aboard = entity.get(AboardTrait);
    if (aboard) return world.getEntity(aboard.vehicleId);
    current = world.getLocation(current);
  }
  return undefined;
}

/**
 * Whether a vehicle lists a command set (ADR-366 D5i): the words are always
 * grammar, so a set the vehicle does not take is the action's refusal,
 * `vehicle-no-such-command`.
 *
 * @param vehicle - A vehicle
 * @param set - `compass`, `destinations`, or an extension's set
 */
export function takesCommandSet(vehicle: IFEntity, set: string): boolean {
  return vehicle.get(VehicleTrait)?.commands?.includes(set) ?? false;
}
