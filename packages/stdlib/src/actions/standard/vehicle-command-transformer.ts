/**
 * Vehicle command transformer (ADR-366 D5b, D5c, D7).
 *
 * Runs after parse / before validate, so the player's gesture lands on the
 * one action that owns it aboard the vehicle they are in:
 *
 * - `go <direction>` aboard a compass vehicle that lists the `compass` set
 *   is steering: the two gestures set the heading and mean one thing (D5c).
 * - `steer <direction>` aboard a streets vehicle is going: GO drives a
 *   streets vehicle one exit, with the room description that follows (D5b).
 * - `exit` / `disembark` / `out` in a room aboard a vehicle that has a `to
 *   outside` exit is going that way, so the hatch door and the under-way
 *   refusal apply as on any exit (D7); a room aboard with no such exit is
 *   left to exiting, which refuses `vehicle-not-at-hatch`.
 *
 * The engine auto-registers this transformer beside the deadly-room one. It
 * is a plain `(parsed, world) => parsed` function so stdlib need not import
 * the engine's `ParsedCommandTransformer` type.
 *
 * Public interface: `createVehicleCommandTransformer`.
 * Owner context: `@sharpee/stdlib` — the vehicle command sets (ADR-366).
 */

import {
  AboardTrait,
  getVehicleAboard,
  type IParsedCommand,
  takesCommandSet,
  VehicleTrait,
  type WorldModel,
} from '@sharpee/world-model';
import { IFActions } from '../constants.js';
import { COMPASS_COMMAND_SET } from './steering/steering.js';

/** The parsed command re-aimed at another action, its noun dropped when the new action takes none. */
function retarget(parsed: IParsedCommand, action: string, extras?: Record<string, unknown>, dropNoun = false): IParsedCommand {
  return {
    ...parsed,
    action,
    ...(extras ? { extras: { ...parsed.extras, ...extras } } : {}),
    ...(dropNoun ? { structure: { verb: parsed.structure.verb } } : {}),
  };
}

/**
 * Build the vehicle command transformer. Returns the parsed command unchanged
 * unless the player's place aboard a vehicle gives the gesture another owner.
 */
export function createVehicleCommandTransformer(): (parsed: IParsedCommand, world: WorldModel) => IParsedCommand {
  return (parsed: IParsedCommand, world: WorldModel): IParsedCommand => {
    const player = world.getPlayer();
    if (!player) return parsed;

    if (parsed.action === IFActions.GOING || parsed.action === IFActions.STEERING) {
      if (!parsed.extras?.direction) return parsed;
      const vehicle = getVehicleAboard(world, player.id);
      const model = vehicle?.get(VehicleTrait)?.model;
      if (!vehicle || !takesCommandSet(vehicle, COMPASS_COMMAND_SET)) return parsed;
      if (parsed.action === IFActions.GOING && model?.kind === 'compass') return retarget(parsed, IFActions.STEERING);
      if (parsed.action === IFActions.STEERING && model?.kind === 'streets') return retarget(parsed, IFActions.GOING);
      return parsed;
    }

    if (parsed.action === IFActions.EXITING) {
      const location = world.getLocation(player.id);
      const room = location !== undefined ? world.getEntity(location) : undefined;
      const aboard = room?.get(AboardTrait);
      const direction = aboard ? Object.keys(aboard.outside)[0] : undefined;
      if (!direction) return parsed;
      return retarget(parsed, IFActions.GOING, { direction }, true);
    }

    return parsed;
  };
}
