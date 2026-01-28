/**
 * River Handler
 *
 * Implements Frigid River navigation mechanics matching Mainframe Zork:
 * 1. Blocks entry to water rooms without boat
 * 2. Moves boat with player when navigating river
 *
 * Note: Falls death is handled separately by falls-death-handler.ts
 */

import { WorldModel, IParsedCommand, VehicleTrait, TraitType, RoomTrait, DirectionType } from '@sharpee/world-model';
import { ParsedCommandTransformer } from '@sharpee/engine';
import { RIVER_BLOCKED_ACTION_ID } from '../actions/river-blocked/types';
import { RiverNavigationTrait } from '../traits';

// Set of water room IDs
let waterRoomIds: Set<string> = new Set();

/**
 * Register water room IDs for checking
 */
export function registerWaterRooms(roomIds: string[]): void {
  waterRoomIds = new Set(roomIds);
}

/**
 * Check if player is in an inflated boat
 */
function isPlayerInBoat(world: WorldModel): boolean {
  const player = world.getPlayer();
  if (!player) return false;

  const playerLocation = world.getLocation(player.id);
  if (!playerLocation) return false;

  const locationEntity = world.getEntity(playerLocation);
  if (!locationEntity) return false;

  // Check if location has VehicleTrait with watercraft type
  if (!locationEntity.has(TraitType.VEHICLE)) return false;

  const vehicleTrait = locationEntity.get(VehicleTrait);
  return vehicleTrait?.vehicleType === 'watercraft';
}

/**
 * Get destination room ID from going command
 */
function getDestinationRoom(world: WorldModel, direction: string): string | null {
  const player = world.getPlayer();
  if (!player) return null;

  // Get containing room (handles being in boat in room)
  const containingRoom = world.getContainingRoom(player.id);
  if (!containingRoom) return null;

  const roomTrait = containingRoom.get(RoomTrait);
  if (!roomTrait) return null;

  // Direction from parser is lowercase, but RoomTrait uses uppercase DirectionType
  const upperDirection = direction.toUpperCase() as DirectionType;
  const exit = roomTrait.exits[upperDirection];
  return exit?.destination || null;
}

/**
 * Extract direction from parsed command
 */
function getDirection(parsed: IParsedCommand): string | null {
  // Check extras first (set by parser)
  if (parsed.extras?.direction) {
    return String(parsed.extras.direction).toLowerCase();
  }

  // Check structure for direct object
  if (parsed.structure?.directObject?.head) {
    return parsed.structure.directObject.head.toLowerCase();
  }

  return null;
}

/**
 * Check if player is on the rainbow (can walk to/from water rooms)
 */
function isPlayerOnRainbow(world: WorldModel): boolean {
  const player = world.getPlayer();
  if (!player) return false;

  const containingRoom = world.getContainingRoom(player.id);
  if (!containingRoom) return false;

  // Check RiverNavigationTrait for rainbow room marker
  const riverNav = containingRoom.get(RiverNavigationTrait);
  return riverNav?.isRainbowRoom === true;
}

/**
 * Create command transformer for river entry blocking
 *
 * Intercepts GO commands and blocks entry to water rooms without boat.
 */
export function createRiverEntryTransformer(): ParsedCommandTransformer {
  return (parsed: IParsedCommand, world: WorldModel): IParsedCommand => {
    // Only intercept going actions
    const actionId = parsed.action?.toLowerCase();
    if (actionId !== 'go' && actionId !== 'going' && actionId !== 'if.action.going') {
      return parsed;
    }

    const direction = getDirection(parsed);
    if (!direction) return parsed;

    const destination = getDestinationRoom(world, direction);
    if (!destination) return parsed;

    // Check if destination is a water room via RiverNavigationTrait
    const destRoom = world.getEntity(destination);
    const riverNav = destRoom?.get(RiverNavigationTrait);
    if (!destRoom || !riverNav?.isWaterRoom) {
      return parsed;
    }

    // Allow if player is in boat
    if (isPlayerInBoat(world)) {
      return parsed;
    }

    // Allow if player is on rainbow (magic bridge to falls)
    if (isPlayerOnRainbow(world)) {
      return parsed;
    }

    // Block movement - redirect to river blocked action
    return {
      ...parsed,
      action: RIVER_BLOCKED_ACTION_ID,
      extras: {
        ...parsed.extras,
        originalAction: parsed.action,
        isRiverBlocked: true
      }
    };
  };
}

// Message IDs for river navigation
export const RiverMessages = {
  NO_BOAT: 'dungeo.river.no_boat',
  NEED_INFLATED_BOAT: 'dungeo.river.need_inflated_boat'
} as const;
