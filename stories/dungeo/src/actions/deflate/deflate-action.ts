/**
 * Deflate Action - Deflate the rubber boat by opening the valve
 *
 * The inflatable boat must be inflated. No tools required.
 * Per Zork instructions: "To Deflate: Open valve."
 *
 * Pattern: "deflate boat", "open valve"
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait, IFEntity, TraitType } from '@sharpee/world-model';
import { DEFLATE_ACTION_ID, DeflateMessages } from './types';

/**
 * Check if entity is the inflatable boat (deflated or inflated)
 */
function isBoat(entity: IFEntity): boolean {
  const identity = entity.get(IdentityTrait);
  if (!identity) return false;

  const name = identity.name?.toLowerCase() || '';
  const aliases = identity.aliases || [];

  // Check name or aliases for boat-related terms
  const boatTerms = ['boat', 'raft', 'plastic', 'pile'];
  return boatTerms.some(term => name.includes(term)) ||
    aliases.some((a: string) => boatTerms.some(term => a.toLowerCase().includes(term)));
}

/**
 * Find boat in current location or inventory
 */
function findBoat(context: ActionContext): IFEntity | undefined {
  const { world, player } = context;
  const playerLocation = world.getLocation(player.id);

  // Check inventory first
  const inventory = world.getContents(player.id);
  const boatInInventory = inventory.find(item => isBoat(item));
  if (boatInInventory) return boatInInventory;

  // Check if player is inside the boat
  if (playerLocation) {
    const locationEntity = world.getEntity(playerLocation);
    if (locationEntity && isBoat(locationEntity)) {
      return locationEntity;
    }

    // Check room contents (sibling items)
    const roomContents = world.getContents(playerLocation);
    const boatInRoom = roomContents.find(item => isBoat(item));
    if (boatInRoom) return boatInRoom;
  }

  return undefined;
}

export const deflateAction: Action = {
  id: DEFLATE_ACTION_ID,
  group: 'manipulation',

  validate(context: ActionContext): ValidationResult {
    // Find the boat
    const boat = findBoat(context);
    if (!boat) {
      return {
        valid: false,
        error: DeflateMessages.NOT_DEFLATABLE
      };
    }

    // Check if boat is already deflated
    if (!(boat as any).isInflated) {
      return {
        valid: false,
        error: DeflateMessages.ALREADY_DEFLATED
      };
    }

    context.sharedData.boat = boat;
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { sharedData, world, player } = context;
    const boat = sharedData.boat as IFEntity;

    // Eject player if inside the boat before deflating
    const playerLocation = world.getLocation(player.id);
    if (playerLocation === boat.id) {
      const boatLocation = world.getLocation(boat.id);
      if (boatLocation) {
        world.moveEntity(player.id, boatLocation);
        sharedData.wasEjected = true;
      }
    }

    // Deflate the boat
    (boat as any).isInflated = false;

    // Update name and description to reflect deflated state
    const identity = boat.get(IdentityTrait);
    if (identity) {
      identity.name = 'pile of plastic';
      identity.article = 'a';
      identity.description = 'There is a folded pile of plastic here which has a small valve attached.';
    }

    // Remove traits when deflating - boat is no longer enterable/vehicle
    if (boat.has(TraitType.ENTERABLE)) {
      boat.remove(TraitType.ENTERABLE);
    }
    if (boat.has(TraitType.VEHICLE)) {
      boat.remove(TraitType.VEHICLE);
    }
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: DEFLATE_ACTION_ID,
      messageId: result.error || DeflateMessages.NOT_DEFLATABLE,
      reason: result.error
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    return [context.event('game.message', {
      messageId: DeflateMessages.SUCCESS
    })];
  }
};
