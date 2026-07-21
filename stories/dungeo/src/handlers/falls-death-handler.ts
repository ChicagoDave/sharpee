/**
 * Falls Death Handler — the Aragain Falls deadly exit (ADR-227).
 *
 * Going SOUTH at Aragain Falls takes the player over the falls to their death.
 * Per MDL FALLS-ROOM (act2.mud:203): only going over the falls is fatal — the
 * player retreats north normally, and wait/take/inventory/look are all safe.
 * (The old inverted verb-allowlist that killed on any non-LOOK action was
 * over-implementation, dropped per ADR-227 Consequences.)
 *
 * Mechanism: a ParsedCommandTransformer (the movement-context hazard surface,
 * ADR-227 Decision 2 amendment) redirecting to the platform's generic
 * extras-driven deadly-death action (ADR-224). The deadly exit is NOT in the
 * room graph (`exits: {}`), so only this pre-validate seam can catch it.
 *
 * Public interface: `createFallsDeathTransformer`, `registerFallsRoom`,
 * `FallsDeathMessages`.
 * Owner context: stories/dungeo — death triggers (ADR-227 Phase 1).
 */

import { WorldModel, IParsedCommand, TraitType } from '@sharpee/world-model';
import { ParsedCommandTransformer } from '@sharpee/engine';
import {
  DEADLY_ROOM_DEATH_ACTION_ID,
  DEADLY_ROOM_CAUSE_KEY,
  DEADLY_ROOM_MESSAGE_KEY,
} from '@sharpee/stdlib';

// Falls room ID - set during registration
let fallsRoomId: string | null = null;

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
 * The deadly exit: only going SOUTH (over the falls) is fatal.
 */
function isDeadlyExit(parsed: IParsedCommand): boolean {
  const actionId = parsed.action?.toLowerCase() || '';
  if (actionId !== 'if.action.going' && actionId !== 'going') return false;

  // Direction is stored in extras (uppercase like 'SOUTH')
  const direction = (parsed.extras?.direction as string)?.toUpperCase() || '';
  return direction === 'SOUTH' || direction === 'S';
}

/**
 * Create command transformer for the falls deadly exit.
 *
 * Redirects `go south` at Aragain Falls to the platform's generic deadly-death
 * action, threading cause/messageId through extras — the same seam Chord's
 * `<direction> is deadly:` lowering uses (AC-1 parity precedent).
 */
export function createFallsDeathTransformer(): ParsedCommandTransformer {
  return (parsed: IParsedCommand, world: WorldModel): IParsedCommand => {
    // Check if falls room is registered
    if (!fallsRoomId) return parsed;

    // Check if player is at falls
    const playerRoom = getPlayerRoom(world);
    if (playerRoom !== fallsRoomId) return parsed;

    // Only going south (over the falls) is deadly
    if (!isDeadlyExit(parsed)) return parsed;

    return {
      ...parsed,
      action: DEADLY_ROOM_DEATH_ACTION_ID,
      extras: {
        ...parsed.extras,
        [DEADLY_ROOM_CAUSE_KEY]: 'aragain_falls',
        [DEADLY_ROOM_MESSAGE_KEY]: FallsDeathMessages.DEATH,
        originalAction: parsed.action,
      },
    };
  };
}

/**
 * Register the falls room for death checking
 */
export function registerFallsRoom(aragainFallsId: string): void {
  fallsRoomId = aragainFallsId;
}
