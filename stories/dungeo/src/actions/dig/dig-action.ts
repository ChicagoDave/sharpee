/**
 * Dig Action - Dig with shovel to uncover buried items
 *
 * Primary use: Dig at Sandy Beach to find the statue (requires 4 digs)
 * Pattern: "dig", "dig with shovel", "dig sand"
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait, IFEntity, WorldModel } from '@sharpee/world-model';
import { DIG_ACTION_ID, DigMessages } from './types';

// Rooms where digging can find something
const DIGGABLE_ROOMS: Record<string, { treasure: string; digsRequired: number }> = {
  'sandy-beach': { treasure: 'statue', digsRequired: 4 },
};

/**
 * Check if entity is a shovel
 */
function isShovel(entity: IFEntity): boolean {
  const identity = entity.get(IdentityTrait);
  if (!identity) return false;

  const name = identity.name?.toLowerCase() || '';
  const aliases = identity.aliases || [];

  return name.includes('shovel') ||
    aliases.some((a: string) => a.toLowerCase().includes('shovel'));
}

/**
 * Find shovel in player's inventory
 */
function findShovel(context: ActionContext): IFEntity | undefined {
  const inventory = context.world.getContents(context.player.id);
  return inventory.find(item => isShovel(item));
}

/**
 * Get the room key for checking diggable locations
 */
function getRoomKey(world: WorldModel, locationId: string): string | undefined {
  const room = world.getEntity(locationId);
  if (!room) return undefined;

  const identity = room.get(IdentityTrait);
  const roomName = identity?.name?.toLowerCase() || '';

  // Try to match against known diggable rooms
  for (const key of Object.keys(DIGGABLE_ROOMS)) {
    const keyAsName = key.replace(/-/g, ' '); // sandy-beach -> sandy beach
    if (locationId.toLowerCase().includes(key) ||
        locationId.toLowerCase().includes(keyAsName) ||
        roomName.includes(keyAsName) ||
        roomName.includes(key)) {
      return key;
    }
  }
  return undefined;
}

export const digAction: Action = {
  id: DIG_ACTION_ID,
  group: 'manipulation',

  validate(context: ActionContext): ValidationResult {
    const { world, player } = context;

    // Must have shovel
    const shovel = findShovel(context);
    if (!shovel) {
      return {
        valid: false,
        error: DigMessages.NO_SHOVEL
      };
    }

    const playerLocation = world.getLocation(player.id) || '';
    const roomKey = getRoomKey(world, playerLocation);

    // Check if this location is diggable
    if (!roomKey) {
      return {
        valid: false,
        error: DigMessages.CANT_DIG_HERE
      };
    }

    context.sharedData.shovel = shovel;
    context.sharedData.roomKey = roomKey;
    context.sharedData.playerLocation = playerLocation;
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world, sharedData } = context;

    const roomKey = sharedData.roomKey as string;
    const diggableInfo = DIGGABLE_ROOMS[roomKey];

    if (!diggableInfo) return;

    // Get current dig count for this room
    const digCountKey = `dungeo.dig.${roomKey}.count`;
    const currentDigs = (world.getStateValue(digCountKey) as number) || 0;
    const newDigs = currentDigs + 1;

    world.setStateValue(digCountKey, newDigs);

    // Check if treasure already found
    const foundKey = `dungeo.dig.${roomKey}.found`;
    const alreadyFound = (world.getStateValue(foundKey) as boolean) || false;

    if (alreadyFound) {
      sharedData.alreadyFound = true;
      return;
    }

    // Check if enough digs to find treasure
    if (newDigs >= diggableInfo.digsRequired) {
      world.setStateValue(foundKey, true);
      sharedData.foundTreasure = diggableInfo.treasure;
      sharedData.digCount = newDigs;

      // Find and reveal the statue entity
      const statueLocationId = world.getStateValue('dungeo.statue.locationId') as string;
      const statue = world.getAllEntities().find(e => {
        const identity = e.get(IdentityTrait);
        return identity?.name?.toLowerCase().includes('statue');
      });

      if (statue && statueLocationId) {
        // Move statue to the room (now visible)
        world.moveEntity(statue.id, statueLocationId);
      }

      world.setStateValue(`dungeo.${diggableInfo.treasure}.revealed`, true);
    } else {
      sharedData.keepDigging = true;
      sharedData.digCount = newDigs;
      sharedData.digsRemaining = diggableInfo.digsRequired - newDigs;
    }
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: DIG_ACTION_ID,
      messageId: result.error || DigMessages.CANT_DIG_HERE,
      reason: result.error
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const { sharedData } = context;
    const events: ISemanticEvent[] = [];

    if (sharedData.alreadyFound) {
      events.push(context.event('game.message', {
        messageId: DigMessages.NOTHING_HERE
      }));
    } else if (sharedData.foundTreasure) {
      events.push(context.event('game.message', {
        messageId: DigMessages.FOUND_STATUE,
        treasure: sharedData.foundTreasure
      }));
    } else if (sharedData.keepDigging) {
      events.push(context.event('game.message', {
        messageId: DigMessages.KEEP_DIGGING,
        digCount: sharedData.digCount,
        digsRemaining: sharedData.digsRemaining
      }));
    } else {
      events.push(context.event('game.message', {
        messageId: DigMessages.SUCCESS
      }));
    }

    return events;
  }
};
