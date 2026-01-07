/**
 * Falls Death Handler
 *
 * Implements instant death at Aragain Falls per Mainframe Zork Fortran source.
 * ANY action besides LOOK while at the falls kills the player.
 *
 * Per FORTRAN source (rooms.for line 577):
 *   IF(PRSA.NE.LOOKW) CALL JIGSUP(85) !OVER YOU GO.
 *
 * This uses a command transformer to intercept non-LOOK commands at falls
 * and redirect them to a death action.
 */

import { WorldModel, IParsedCommand, TraitType, VehicleTrait } from '@sharpee/world-model';
import { ParsedCommandTransformer } from '@sharpee/engine';

// Falls room ID - set during registration
let fallsRoomId: string | null = null;

// Death action ID
export const FALLS_DEATH_ACTION_ID = 'dungeo.action.falls_death';

// Message IDs
export const FallsDeathMessages = {
  DEATH: 'dungeo.falls.death'
} as const;

/**
 * Get the player's containing room, handling being inside a vehicle
 */
function getPlayerRoom(world: WorldModel): string | null {
  const player = world.getPlayer();
  if (!player) return null;

  const playerLocation = world.getLocation(player.id);
  if (!playerLocation) return null;

  // Check if player is in a vehicle (boat)
  const locationEntity = world.getEntity(playerLocation);
  if (locationEntity?.has(TraitType.VEHICLE)) {
    // Player is in vehicle - get the vehicle's location
    return world.getLocation(playerLocation) || null;
  }

  return playerLocation;
}

/**
 * Check if the action is safe at falls (LOOK/EXAMINE or GDT commands)
 */
function isSafeAction(parsed: IParsedCommand): boolean {
  const actionId = parsed.action?.toLowerCase() || '';

  // LOOK and EXAMINE are safe
  const safeActions = [
    'look', 'looking', 'if.action.looking',
    'examine', 'examining', 'if.action.examining',
    'l' // Common abbreviation
  ];

  if (safeActions.includes(actionId)) return true;

  // GDT commands are always safe (debugging tool)
  if (actionId.startsWith('dungeo.action.gdt')) return true;

  return false;
}

/**
 * Create command transformer for falls death
 *
 * Intercepts any non-LOOK command at Aragain Falls and redirects to death.
 */
export function createFallsDeathTransformer(): ParsedCommandTransformer {
  return (parsed: IParsedCommand, world: WorldModel): IParsedCommand => {
    // Check if falls room is registered
    if (!fallsRoomId) return parsed;

    // Check if player is at falls
    const playerRoom = getPlayerRoom(world);
    if (playerRoom !== fallsRoomId) return parsed;

    // LOOK is safe - allow it
    if (isSafeAction(parsed)) return parsed;

    // Any other action = death
    return {
      ...parsed,
      action: FALLS_DEATH_ACTION_ID,
      extras: {
        ...parsed.extras,
        originalAction: parsed.action,
        isFallsDeath: true
      }
    };
  };
}

/**
 * Register the falls room for death checking
 */
export function registerFallsRoom(aragainFallsId: string): void {
  fallsRoomId = aragainFallsId;
}
