/**
 * Inflate Action - Inflate the rubber boat with the hand pump
 *
 * The inflatable boat must be deflated and the player must have the pump.
 * Per Zork instructions: "To Inflate: Apply pump to valve."
 *
 * Pattern: "inflate boat", "inflate boat with pump", "pump boat"
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait, IFEntity } from '@sharpee/world-model';
import { INFLATE_ACTION_ID, InflateMessages } from './types';

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
 * Check if entity is the hand pump
 */
function isPump(entity: IFEntity): boolean {
  const identity = entity.get(IdentityTrait);
  if (!identity) return false;

  const name = identity.name?.toLowerCase() || '';
  const aliases = identity.aliases || [];

  return name.includes('pump') ||
    aliases.some((a: string) => a.toLowerCase().includes('pump'));
}

/**
 * Find pump in player's inventory
 */
function findPump(context: ActionContext): IFEntity | undefined {
  const inventory = context.world.getContents(context.player.id);
  return inventory.find(item => isPump(item));
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

  // Check room
  if (playerLocation) {
    const roomContents = world.getContents(playerLocation);
    const boatInRoom = roomContents.find(item => isBoat(item));
    if (boatInRoom) return boatInRoom;
  }

  return undefined;
}

export const inflateAction: Action = {
  id: INFLATE_ACTION_ID,
  group: 'manipulation',

  validate(context: ActionContext): ValidationResult {
    // Find the boat
    const boat = findBoat(context);
    if (!boat) {
      return {
        valid: false,
        error: InflateMessages.NOT_INFLATABLE
      };
    }

    // Check if boat is already inflated
    if ((boat as any).isInflated) {
      return {
        valid: false,
        error: InflateMessages.ALREADY_INFLATED
      };
    }

    // Must have pump
    const pump = findPump(context);
    if (!pump) {
      return {
        valid: false,
        error: InflateMessages.NO_PUMP
      };
    }

    context.sharedData.boat = boat;
    context.sharedData.pump = pump;
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { sharedData } = context;
    const boat = sharedData.boat as IFEntity;

    // Inflate the boat
    (boat as any).isInflated = true;

    // Update name and description to reflect inflated state
    const identity = boat.get(IdentityTrait);
    if (identity) {
      identity.name = 'magic boat';
      identity.article = 'a';
      identity.description = 'The boat is a seaworthy craft approximately eight feet long. A pair of oars is affixed to the side.';
    }
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: INFLATE_ACTION_ID,
      messageId: result.error || InflateMessages.NOT_INFLATABLE,
      reason: result.error
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    return [context.event('game.message', {
      messageId: InflateMessages.SUCCESS
    })];
  }
};
