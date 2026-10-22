/**
 * Vehicle Machine - the per-turn phase that steps every vehicle's built-in machine and drifts every expanse
 *
 * Public interface: `VehiclePositionResolver` (the host's answer for a
 * `drive: state` line's `position` block), `ExpanseEdgeTextResolver` (the
 * host's text for an authored edge phrase), `VehicleTickOptions`,
 * `tickVehicles` (one turn over every vehicle and every expanse in the
 * world, returning the events the steps earned), and the event types
 * `VEHICLE_ARRIVED_EVENT`, `VEHICLE_STOPPED_EVENT`, `VEHICLE_ALONGSIDE_EVENT`
 * and `EXPANSE_EDGE_EVENT`.
 *
 * Owner context: plugin-state-machine. The vehicle's machine is a phase of
 * the state-machine plugin, run after the story's own machines each turn
 * (ADR-377 D3). The stepping itself is world-model's `stepVehicle` and the
 * drift world-model's `driftExpanse`; this module only decides which
 * vehicles to step, hands a state-driven line the stop its `position` block
 * names, draws drift from the session's random service, and turns each step
 * into the event the player can read: `vehicle-arrived` when they are aboard
 * or in the room the vehicle reached, `vehicle-stopped` and
 * `vehicle-alongside` when they are aboard, an edge once when they are
 * aboard — the author's phrase through going's blocked-movement line, else
 * the stock `expanse-edge`. Drift and wash-up are silent: the author's
 * `when <thing> moves` clause is the hook.
 *
 * References:
 * - ADR-366 D5e — the machine is ticked by the engine's turn cycle here.
 * - ADR-366 D5a — a `drive: state` line reads its `position` block each turn.
 * - ADR-366 D7a — `vehicle-arrived` and `vehicle-stopped` are stock lines.
 * - ADR-376 D8, D10 — the edge and alongside reports; drift from the seeded service.
 * - ADR-377 D3 — no second turn host; the vehicle phase runs in this plugin.
 */

import { type ISemanticEvent, type RandomService } from '@sharpee/core';
import {
  driftExpanse,
  type ExpanseSide,
  type IFEntity,
  isAboardVehicle,
  stepVehicle,
  TraitType,
  WorldModel,
} from '@sharpee/world-model';

/** The event a vehicle's machine records when it reaches a room. */
export const VEHICLE_ARRIVED_EVENT = 'if.event.vehicle_arrived';
/** The event a vehicle's machine records when it runs out of way and halts. */
export const VEHICLE_STOPPED_EVENT = 'if.event.vehicle_stopped';
/** The event an open vehicle's machine records when it stops alongside a floating thing (ADR-376 D10). */
export const VEHICLE_ALONGSIDE_EVENT = 'if.event.vehicle_alongside';
/** The event an open vehicle's machine records when it stops at an edge of its expanse (ADR-376 D8). */
export const EXPANSE_EDGE_EVENT = 'if.event.expanse_edge';
/** The event a sailing vehicle's machine records when it lies in irons (ADR-375 D5), once. */
export const VEHICLE_IN_IRONS_EVENT = 'if.event.vehicle_in_irons';

/** The stock lines the reports render through (ADR-366 D7a, ADR-376 D8, D10). */
const VEHICLE_ARRIVED_MESSAGE = 'if.action.going.vehicle_arrived';
const VEHICLE_STOPPED_MESSAGE = 'if.action.going.vehicle_stopped';
const VEHICLE_ALONGSIDE_MESSAGE = 'if.action.going.vehicle_alongside';
const EXPANSE_EDGE_MESSAGE = 'if.action.going.expanse_edge';
/** ADR-375 D6: the unwritten edge of a sea under sail is weather. */
const SAILING_EDGE_MESSAGE = 'if.action.going.sailing_edge';
const VEHICLE_IN_IRONS_MESSAGE = 'if.action.going.vehicle_in_irons';
/** Going's line for an authored refusal, rendering the host's text verbatim. */
const MOVEMENT_BLOCKED_MESSAGE = 'if.action.going.movement_blocked';

/**
 * The host's reading of a `drive: state` line's `position` block (ADR-366
 * D5a): the stop the block names this turn, or undefined when the vehicle
 * has no block. The block's guards are compiled code the loader holds, so
 * the host that lowered them answers; the trait carries only data (D5g).
 */
export type VehiclePositionResolver = (vehicle: IFEntity, world: WorldModel) => string | undefined;

/**
 * The host's text for an expanse edge the author wrote a phrase for (ADR-376
 * D8): the phrase key is trait data, its text is the host's phrasebook. The
 * host resolves it at report time so a varied phrase varies.
 */
export type ExpanseEdgeTextResolver = (expanse: IFEntity, side: ExpanseSide, messageKey: string, world: WorldModel) => string | undefined;

/** What the host lends the tick. */
export interface VehicleTickOptions {
  positionOf?: VehiclePositionResolver;
  edgeText?: ExpanseEdgeTextResolver;
}

let eventCounter = 0;

function vehicleEvent(type: string, messageId: string, vehicle: IFEntity, params: Record<string, unknown>, data: Record<string, unknown>): ISemanticEvent {
  return {
    id: `vehicle-${++eventCounter}`,
    type,
    timestamp: Date.now(),
    entities: { target: vehicle.id },
    data: { messageId, params: { vehicle: vehicle.name, ...params }, vehicleId: vehicle.id, ...data },
    tags: ['state-machine', 'vehicle'],
  };
}

/**
 * Step every vehicle's machine once (ADR-366 D5e), drift every expanse
 * (ADR-376 D10), and return the reports the player can read. A vehicle at
 * rest earns nothing; a world with no vehicles and no expanses costs two
 * trait lookups.
 *
 * @param world - The live world
 * @param playerId - The player, whose place decides what is reported
 * @param random - The session's random service, for drift (ADR-293) and
 *   for a computed way a compass vehicle's heading meets (ADR-295 D4)
 * @param options - The host's `position` block reader and edge-phrase text,
 *   each absent when the host lowers nothing that needs it
 * @returns the turn's `vehicle_arrived`, `vehicle_stopped`, `vehicle_alongside` and `expanse_edge` events
 */
export function tickVehicles(world: WorldModel, playerId: string, random: RandomService, options: VehicleTickOptions = {}): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];
  for (const vehicle of world.findByTrait(TraitType.VEHICLE)) {
    const step = stepVehicle(world, vehicle, options.positionOf?.(vehicle, world), random);
    if (!step) continue;
    const aboard = isAboardVehicle(world, playerId, vehicle.id);
    switch (step.kind) {
      case 'arrived': {
        const room = world.getEntity(step.roomId);
        const playerRoom = world.getContainingRoom(playerId);
        if (aboard || playerRoom?.id === step.roomId) {
          events.push(vehicleEvent(VEHICLE_ARRIVED_EVENT, VEHICLE_ARRIVED_MESSAGE, vehicle, { stop: room?.name ?? step.roomId }, { stopId: step.roomId, aboard }));
        }
        break;
      }
      case 'stopped':
        if (aboard) events.push(vehicleEvent(VEHICLE_STOPPED_EVENT, VEHICLE_STOPPED_MESSAGE, vehicle, {}, { aboard }));
        break;
      case 'alongside': {
        if (!aboard) break;
        const thing = world.getEntity(step.thingId);
        events.push(vehicleEvent(VEHICLE_ALONGSIDE_EVENT, VEHICLE_ALONGSIDE_MESSAGE, vehicle, { thing: thing?.name ?? step.thingId }, { thingId: step.thingId, aboard }));
        break;
      }
      case 'edge': {
        if (!aboard) break;
        const location = world.getLocation(vehicle.id);
        const expanse = location !== undefined ? world.getEntity(location) : undefined;
        const text = step.messageKey !== undefined && expanse ? options.edgeText?.(expanse, step.side, step.messageKey, world) : undefined;
        events.push(
          text !== undefined
            ? vehicleEvent(EXPANSE_EDGE_EVENT, MOVEMENT_BLOCKED_MESSAGE, vehicle, { message: text }, { side: step.side, messageKey: step.messageKey, aboard })
            : vehicleEvent(EXPANSE_EDGE_EVENT, step.sailing ? SAILING_EDGE_MESSAGE : EXPANSE_EDGE_MESSAGE, vehicle, {}, { side: step.side, aboard }),
        );
        break;
      }
      case 'in-irons':
        if (aboard) events.push(vehicleEvent(VEHICLE_IN_IRONS_EVENT, VEHICLE_IN_IRONS_MESSAGE, vehicle, {}, { aboard }));
        break;
      case 'departed':
        break;
    }
  }
  for (const expanse of world.findByTrait(TraitType.EXPANSE)) {
    driftExpanse(world, expanse, random);
  }
  return events;
}
