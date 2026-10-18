/**
 * Vehicle Machine - the per-turn phase that steps every vehicle's built-in machine
 *
 * Public interface: `VehiclePositionResolver` (the host's answer for a
 * `drive: state` line's `position` block), `tickVehicles` (one turn over
 * every vehicle in the world, returning the events the steps earned), and
 * the event types `VEHICLE_ARRIVED_EVENT` and `VEHICLE_STOPPED_EVENT`.
 *
 * Owner context: plugin-state-machine. The vehicle's machine is a phase of
 * the state-machine plugin, run after the story's own machines each turn
 * (ADR-377 D3). The stepping itself is world-model's `stepVehicle`; this
 * module only decides which vehicles to step, hands a state-driven line
 * the stop its `position` block names, and turns each step into the event
 * the player can read: `vehicle-arrived` when they are aboard or in the
 * room the vehicle reached, `vehicle-stopped` when they are aboard.
 *
 * References:
 * - ADR-366 D5e — the machine is ticked by the engine's turn cycle here.
 * - ADR-366 D5a — a `drive: state` line reads its `position` block each turn.
 * - ADR-366 D7a — `vehicle-arrived` and `vehicle-stopped` are stock lines.
 * - ADR-377 D3 — no second turn host; the vehicle phase runs in this plugin.
 */

import { type ISemanticEvent } from '@sharpee/core';
import {
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

/** The stock lines the two reports render through (ADR-366 D7a). */
const VEHICLE_ARRIVED_MESSAGE = 'if.action.going.vehicle_arrived';
const VEHICLE_STOPPED_MESSAGE = 'if.action.going.vehicle_stopped';

/**
 * The host's reading of a `drive: state` line's `position` block (ADR-366
 * D5a): the stop the block names this turn, or undefined when the vehicle
 * has no block. The block's guards are compiled code the loader holds, so
 * the host that lowered them answers; the trait carries only data (D5g).
 */
export type VehiclePositionResolver = (vehicle: IFEntity, world: WorldModel) => string | undefined;

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
 * Step every vehicle's machine once (ADR-366 D5e) and return the reports
 * the player can read. A vehicle at rest earns nothing; a world with no
 * vehicles costs one trait lookup.
 *
 * @param world - The live world
 * @param playerId - The player, whose place decides what is reported
 * @param positionOf - The host's `position` block reader; absent when the
 *   host lowers no state-driven lines
 * @returns the turn's `vehicle_arrived` and `vehicle_stopped` events
 */
export function tickVehicles(world: WorldModel, playerId: string, positionOf?: VehiclePositionResolver): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];
  for (const vehicle of world.findByTrait(TraitType.VEHICLE)) {
    const step = stepVehicle(world, vehicle, positionOf?.(vehicle, world));
    if (!step) continue;
    const aboard = isAboardVehicle(world, playerId, vehicle.id);
    if (step.kind === 'arrived') {
      const room = world.getEntity(step.roomId);
      const playerRoom = world.getContainingRoom(playerId);
      if (aboard || playerRoom?.id === step.roomId) {
        events.push(vehicleEvent(VEHICLE_ARRIVED_EVENT, VEHICLE_ARRIVED_MESSAGE, vehicle, { stop: room?.name ?? step.roomId }, { stopId: step.roomId, aboard }));
      }
    } else if (step.kind === 'stopped' && aboard) {
      events.push(vehicleEvent(VEHICLE_STOPPED_EVENT, VEHICLE_STOPPED_MESSAGE, vehicle, {}, { aboard }));
    }
  }
  return events;
}
