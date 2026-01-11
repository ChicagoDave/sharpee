/**
 * Launch Action - Launch the boat into the river
 *
 * The player must be in an inflated boat at a shore location with river access.
 * Launching moves the boat and player to the appropriate river room.
 *
 * Launch points and their destinations:
 * - Dam Base → Frigid River 1
 * - Rocky Shore → Frigid River 3 (via E exit)
 * - White Cliffs Beach 1 → Frigid River 3 (via W exit)
 * - White Cliffs Beach 2 → Frigid River 4 (via W exit)
 * - Sandy Beach → Frigid River 4 (via E exit)
 * - Shore → Frigid River 5 (via E exit)
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { VehicleTrait, TraitType, RoomTrait, Direction } from '@sharpee/world-model';
import { LAUNCH_ACTION_ID, LaunchMessages } from './types';

/**
 * Check if player is in an inflated boat
 */
function getPlayerBoat(context: ActionContext): { boat: any; isInBoat: boolean } {
  const { world, player } = context;
  const playerLocation = world.getLocation(player.id);

  if (!playerLocation) {
    return { boat: null, isInBoat: false };
  }

  const locationEntity = world.getEntity(playerLocation);
  if (!locationEntity) {
    return { boat: null, isInBoat: false };
  }

  // Check if location has VehicleTrait with watercraft type
  if (!locationEntity.has(TraitType.VEHICLE)) {
    return { boat: null, isInBoat: false };
  }

  const vehicleTrait = locationEntity.get(VehicleTrait);
  if (!vehicleTrait || vehicleTrait.vehicleType !== 'watercraft') {
    return { boat: null, isInBoat: false };
  }

  return { boat: locationEntity, isInBoat: true };
}

/**
 * Get the river destination for launching from current location
 */
function getLaunchDestination(context: ActionContext): string | null {
  const { world, player } = context;

  // Get the room the boat is in (containing room)
  const containingRoom = world.getContainingRoom(player.id);
  if (!containingRoom) return null;

  // Check if this room is a launch point
  if (!(containingRoom as any).canLaunchBoat) {
    return null;
  }

  // Check for explicit launch destination (Dam Base)
  if ((containingRoom as any).launchDestination) {
    return (containingRoom as any).launchDestination;
  }

  // Otherwise, look for an exit to a water room (E or W)
  const roomTrait = containingRoom.get(RoomTrait);
  if (!roomTrait) return null;

  // Check east exit first, then west
  for (const dir of [Direction.EAST, Direction.WEST]) {
    const exit = roomTrait.exits[dir];
    if (exit?.destination) {
      const destRoom = world.getEntity(exit.destination);
      if (destRoom && (destRoom as any).isWaterRoom) {
        return exit.destination;
      }
    }
  }

  return null;
}

export const launchAction: Action = {
  id: LAUNCH_ACTION_ID,
  group: 'movement',

  validate(context: ActionContext): ValidationResult {
    const { world, player } = context;

    // Check if player is in a boat
    const { boat, isInBoat } = getPlayerBoat(context);
    if (!isInBoat || !boat) {
      return {
        valid: false,
        error: LaunchMessages.NOT_IN_BOAT
      };
    }

    // Check if boat is inflated
    if (!(boat as any).isInflated) {
      return {
        valid: false,
        error: LaunchMessages.BOAT_NOT_INFLATED
      };
    }

    // Check if already on river (water room)
    const containingRoom = world.getContainingRoom(player.id);
    if (containingRoom && (containingRoom as any).isWaterRoom) {
      return {
        valid: false,
        error: LaunchMessages.ALREADY_ON_RIVER
      };
    }

    // Check if at a valid launch point
    const destination = getLaunchDestination(context);
    if (!destination) {
      return {
        valid: false,
        error: LaunchMessages.NOT_AT_SHORE
      };
    }

    context.sharedData.boat = boat;
    context.sharedData.destination = destination;
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world } = context;
    const { boat, destination } = context.sharedData;

    // Move boat to river room
    world.moveEntity(boat.id, destination);

    // Player stays in boat (already inside)
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: LAUNCH_ACTION_ID,
      messageId: result.error || LaunchMessages.NOT_IN_BOAT,
      reason: result.error
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const { world, player } = context;

    // Get the new room for description
    const containingRoom = world.getContainingRoom(player.id);
    const roomName = containingRoom?.name || 'the river';

    return [
      context.event('game.message', {
        messageId: LaunchMessages.SUCCESS
      }),
      // Trigger a look at the new location
      context.event('if.event.actor_moved', {
        actorId: player.id,
        currentLocation: context.sharedData.destination
      })
    ];
  }
};
