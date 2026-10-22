/**
 * Vehicle Machine - the per-turn phase that steps every vehicle's built-in machine and drifts every expanse
 *
 * Public interface: `VehiclePositionResolver` (the host's answer for a
 * `drive: state` line's `position` block), `VehicleTickOptions`, and
 * `tickVehicles` (one turn over every vehicle and every expanse in the
 * world, returning the facts the steps recorded). The event types and the
 * stock lines are world-model's `VEHICLE_EVENT_TYPES` and
 * `VEHICLE_REPORT_MESSAGES`; none is spelled here.
 *
 * Owner context: plugin-state-machine. The vehicle's machine is a phase of
 * the state-machine plugin, run after the story's own machines each turn
 * (ADR-377 D3). The stepping itself is world-model's `stepVehicle` and the
 * drift world-model's `driftExpanse`; this module only decides which
 * vehicles to step, hands a state-driven line the stop its `position` block
 * names, draws drift from the session's random service, and records each
 * step as a past-tense fact. The engine applies every fact a plugin records
 * to the world, so a story's handlers and `when <thing> moves` clauses
 * hear them; who reads what is decided here in two voices:
 *
 * - A rider (the player aboard) is told of every move by containment, lit
 *   or dark: arrived, stopped, alongside, an edge (the author's phrase,
 *   `edgePhraseOf`, through going's blocked-movement line, else the stock
 *   line), caught in irons. A departure is not told to a rider.
 * - A watcher (anyone not aboard) sees a move where it happened, as any
 *   seen thing: the fact carries its place and a sight rendering, so
 *   perception shows it in a lit room, hides it in a dark one, and the
 *   client hides it from a player elsewhere. A watcher sees a vehicle
 *   depart, arrive, stop, come alongside and lie in irons, and sees a
 *   floating thing drift and wash up. An edge is a rider's experience and
 *   is recorded silently for a watcher.
 *
 * A passenger of a vehicle with no rooms aboard is carried into the room it
 * reaches, so each one arrives (`if.event.actor_moved`) as a walker does
 * and the story's `after … entering` clauses fire. A vehicle with rooms
 * aboard is unchanged: its passengers are in a room aboard and arrive by
 * walking out.
 *
 * References:
 * - ADR-366 D5e — the machine is ticked by the engine's turn cycle here.
 * - ADR-366 D5a — a `drive: state` line reads its `position` block each turn.
 * - ADR-366 D7a — `vehicle-arrived` and `vehicle-stopped` are stock lines.
 * - ADR-376 D8, D10 — the edge and alongside reports; drift from the seeded service.
 * - ADR-377 D3 — no second turn host; the vehicle phase runs in this plugin.
 * - Alignment fixes Phase 4 — F4, D13 (one declaration, past-tense facts),
 *   D11 (drift becomes events), Q5 C (riders and watchers), Q6 A
 *   (passengers arrive).
 */

import { type ISemanticEvent, type RandomService } from '@sharpee/core';
import {
  driftExpanse,
  type DriftStep,
  edgePhraseOf,
  getVehicleOccupants,
  type IFEntity,
  isAboardVehicle,
  stepVehicle,
  TraitType,
  VEHICLE_EVENT_TYPES as EVENTS,
  VEHICLE_REPORT_MESSAGES as LINES,
  VehicleTrait,
  WorldModel,
} from '@sharpee/world-model';

/**
 * The host's reading of a `drive: state` line's `position` block (ADR-366
 * D5a): the stop the block names this turn, or undefined when the vehicle
 * has no block. The block's guards are compiled code the loader holds, so
 * the host that lowered them answers; the trait carries only data (D5g).
 */
export type VehiclePositionResolver = (vehicle: IFEntity, world: WorldModel) => string | undefined;

/** What the host lends the tick. */
export interface VehicleTickOptions {
  positionOf?: VehiclePositionResolver;
}

/**
 * A walker's arrival: going records it under this type, and the story's
 * `after … entering` and `when <thing> moves` clauses are bound to it. The
 * plugin depends on world-model alone, so the id is spelled here as at its
 * other readers.
 */
const ACTOR_MOVED = 'if.event.actor_moved';

let eventCounter = 0;

/** The stock line a fact renders through, and its parameters. */
interface Line {
  messageId: string;
  params: Record<string, unknown>;
}

/** A fact about `subject`; `line` and `place` decide who reads it and how. */
function fact(type: string, subject: IFEntity, data: Record<string, unknown>, entities: ISemanticEvent['entities'] = {}): ISemanticEvent {
  return {
    id: `vehicle-${++eventCounter}`,
    type,
    timestamp: Date.now(),
    entities: { target: subject.id, ...entities },
    data,
    tags: ['state-machine', 'vehicle'],
  };
}

/** A fact told to the rider: the line, with no place, so it reaches them wherever they ride, lit or dark. */
function told(type: string, vehicle: IFEntity, line: Line, data: Record<string, unknown>): ISemanticEvent {
  return fact(type, vehicle, { messageId: line.messageId, params: line.params, vehicleId: vehicle.id, ...data });
}

/**
 * A fact a watcher sees: stamped with the place it happened, so presence
 * is tagged from there, and carrying a sight rendering, so perception
 * shows it only to a player who can see (and a host without perception
 * shows the line).
 */
function seen(type: string, subject: IFEntity, placeId: string, line: Line, data: Record<string, unknown>): ISemanticEvent {
  return fact(type, subject, { messageId: line.messageId, params: line.params, renderings: { sight: line }, ...data }, { location: placeId });
}

/** A fact recorded for the world's handlers that nobody reads. */
function silent(type: string, subject: IFEntity, placeId: string | undefined, data: Record<string, unknown>): ISemanticEvent {
  return fact(type, subject, data, placeId !== undefined ? { location: placeId } : {});
}

/** The room an entity is in, through any containers, or where it is when that is no room. */
function placeOf(world: WorldModel, entityId: string): string | undefined {
  return world.getContainingRoom(entityId)?.id ?? world.getLocation(entityId);
}

/**
 * Each passenger of a vehicle with no rooms aboard arrives where the
 * vehicle did (Q6 A). The arrival names no `entities.location`: the
 * standard `actor_moved` handler moves an actor to that location, and a
 * passenger stays in the vehicle. The destination is `toRoom`, where the
 * story's arrival clauses read it.
 */
function passengerArrivals(world: WorldModel, vehicle: IFEntity, fromRoom: string | undefined, toRoom: string): ISemanticEvent[] {
  if (vehicle.get(VehicleTrait)?.boardingRoom !== undefined) return [];
  return getVehicleOccupants(world, vehicle.id).map((passenger) => ({
    id: `vehicle-${++eventCounter}`,
    type: ACTOR_MOVED,
    timestamp: Date.now(),
    entities: { actor: passenger.id },
    data: { actorId: passenger.id, fromRoom, toRoom, vehicleId: vehicle.id },
    tags: ['state-machine', 'vehicle'],
  }));
}

/** The facts of one drift step (D11 a): a drift seen in the expanse, a wash-up seen in the landmark's room. */
function driftFacts(world: WorldModel, expanse: IFEntity, step: DriftStep): ISemanticEvent[] {
  const thing = world.getEntity(step.thingId);
  if (!thing) return [];
  switch (step.kind) {
    case 'drifted':
      return [seen(EVENTS.DRIFTED, thing, expanse.id, { messageId: LINES.DRIFTED, params: { thing: thing.name } }, {
        actorId: thing.id, expanseId: expanse.id, heading: step.heading, cell: step.cell,
      })];
    case 'washed-up':
      return [seen(EVENTS.WASHED_UP, thing, step.roomId, { messageId: LINES.WASHED_UP, params: { thing: thing.name } }, {
        actorId: thing.id, expanseId: expanse.id, heading: step.heading, toRoom: step.roomId,
      })];
    case 'held':
      return [];
  }
}

/**
 * Step every vehicle's machine once (ADR-366 D5e), drift every expanse
 * (ADR-376 D10), and return the facts both recorded, each in the voice its
 * reader is owed. A vehicle at rest and a thing held still record nothing;
 * a world with no vehicles and no expanses costs two trait lookups.
 *
 * @param world - The live world
 * @param playerId - The player: aboard, they are told; elsewhere, they watch
 * @param random - The session's random service, for drift (ADR-293) and
 *   for a computed way a compass vehicle's heading meets (ADR-295 D4)
 * @param options - The host's `position` block reader, absent when the host
 *   lowers no `drive: state` line
 * @returns the turn's departed, arrived, stopped, alongside, edge-reached,
 *   caught-in-irons, passenger-arrival, drifted and washed-up facts
 */
export function tickVehicles(world: WorldModel, playerId: string, random: RandomService, options: VehicleTickOptions = {}): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];
  for (const vehicle of world.findByTrait(TraitType.VEHICLE)) {
    const from = placeOf(world, vehicle.id);
    const step = stepVehicle(world, vehicle, options.positionOf?.(vehicle, world), random);
    if (!step) continue;
    const aboard = isAboardVehicle(world, playerId, vehicle.id);
    const name = { vehicle: vehicle.name };
    const here = placeOf(world, vehicle.id);
    const departure = (): void => {
      if (from === undefined) return;
      events.push(aboard
        ? silent(EVENTS.DEPARTED, vehicle, from, { vehicleId: vehicle.id, fromId: from })
        : seen(EVENTS.DEPARTED, vehicle, from, { messageId: LINES.DEPARTED, params: name }, { vehicleId: vehicle.id, fromId: from }));
    };
    switch (step.kind) {
      case 'arrived': {
        if (from !== step.roomId) departure();
        const room = world.getEntity(step.roomId);
        const line = { messageId: LINES.ARRIVED, params: { ...name, stop: room?.name ?? step.roomId } };
        const data = { vehicleId: vehicle.id, stopId: step.roomId, aboard };
        events.push(aboard ? told(EVENTS.ARRIVED, vehicle, line, data) : seen(EVENTS.ARRIVED, vehicle, step.roomId, line, data));
        events.push(...passengerArrivals(world, vehicle, from, step.roomId));
        break;
      }
      case 'departed':
        departure();
        break;
      case 'stopped': {
        const line = { messageId: LINES.STOPPED, params: name };
        const data = { vehicleId: vehicle.id, aboard };
        if (aboard) events.push(told(EVENTS.STOPPED, vehicle, line, data));
        else if (here !== undefined) events.push(seen(EVENTS.STOPPED, vehicle, here, line, data));
        break;
      }
      case 'alongside': {
        const thing = world.getEntity(step.thingId);
        const line = { messageId: LINES.ALONGSIDE, params: { ...name, thing: thing?.name ?? step.thingId } };
        const data = { vehicleId: vehicle.id, thingId: step.thingId, aboard };
        if (aboard) events.push(told(EVENTS.ALONGSIDE, vehicle, line, data));
        else if (here !== undefined) events.push(seen(EVENTS.ALONGSIDE, vehicle, here, line, data));
        break;
      }
      case 'edge': {
        const data = { vehicleId: vehicle.id, side: step.side, aboard };
        if (!aboard) {
          events.push(silent(EVENTS.EDGE_REACHED, vehicle, here, data));
          break;
        }
        // Asked only for a rider: a varied phrase advances when it is read.
        const expanse = here !== undefined ? world.getEntity(here) : undefined;
        const text = expanse ? edgePhraseOf(world, expanse, step.side) : undefined;
        const line = text !== undefined
          ? { messageId: LINES.MOVEMENT_BLOCKED, params: { ...name, message: text } }
          : { messageId: step.sailing ? LINES.SAILING_EDGE : LINES.EXPANSE_EDGE, params: name };
        events.push(told(EVENTS.EDGE_REACHED, vehicle, line, data));
        break;
      }
      case 'in-irons': {
        const line = { messageId: LINES.IN_IRONS, params: name };
        const data = { vehicleId: vehicle.id, aboard };
        if (aboard) events.push(told(EVENTS.CAUGHT_IN_IRONS, vehicle, line, data));
        else if (here !== undefined) events.push(seen(EVENTS.CAUGHT_IN_IRONS, vehicle, here, line, data));
        break;
      }
    }
  }
  for (const expanse of world.findByTrait(TraitType.EXPANSE)) {
    for (const step of driftExpanse(world, expanse, random)) events.push(...driftFacts(world, expanse, step));
  }
  return events;
}
