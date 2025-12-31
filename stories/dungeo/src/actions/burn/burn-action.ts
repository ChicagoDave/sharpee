/**
 * Burn Action - Story-specific action for burning items
 *
 * Used for burning incense to disarm the basin trap
 * in the ghost ritual puzzle (ADR-078).
 *
 * Pattern: "burn incense", "light incense"
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait, IFEntity } from '@sharpee/world-model';
import { BURN_ACTION_ID, BurnMessages } from './types';

/**
 * Check if an entity is incense
 */
function isIncense(entity: IFEntity): boolean {
  return (entity as any).isIncense === true;
}

/**
 * Check if incense is already burning
 */
function isBurning(entity: IFEntity): boolean {
  return (entity as any).isBurning === true;
}

/**
 * Check if incense is burned out
 */
function isBurnedOut(entity: IFEntity): boolean {
  return (entity as any).burnedOut === true;
}

/**
 * Get the direct object from context
 */
function getDirectObject(context: ActionContext): { entity?: IFEntity; text?: string } | undefined {
  const structure = context.command.parsed?.structure;
  if (!structure?.directObject) {
    return undefined;
  }

  const text = structure.directObject.text || '';
  const entity = context.world.getAllEntities().find(e => {
    const identity = e.get(IdentityTrait);
    if (!identity) return false;
    const name = identity.name?.toLowerCase() || '';
    const aliases = identity.aliases || [];
    const lowerText = text.toLowerCase();
    return name.includes(lowerText) ||
           lowerText.includes(name) ||
           aliases.some((a: string) => a.toLowerCase().includes(lowerText) || lowerText.includes(a.toLowerCase()));
  });

  return { entity, text };
}

/**
 * Find burnable item (incense) in current location or inventory
 */
function findBurnableItem(context: ActionContext): IFEntity | undefined {
  const { world, player } = context;

  // Check player inventory
  const inventory = world.getContents(player.id);
  for (const item of inventory) {
    if (isIncense(item)) {
      return item;
    }
  }

  // Check current room
  const playerLocation = world.getLocation(player.id);
  if (playerLocation) {
    const roomContents = world.getContents(playerLocation);
    for (const item of roomContents) {
      if (isIncense(item)) {
        return item;
      }
    }
  }

  return undefined;
}

/**
 * Burn Action Definition
 */
export const burnAction: Action = {
  id: BURN_ACTION_ID,
  group: 'manipulation',

  validate(context: ActionContext): ValidationResult {
    const directObject = getDirectObject(context);

    // If no target specified, try to find incense
    if (!directObject || !directObject.text) {
      const burnable = findBurnableItem(context);
      if (burnable) {
        // Check if already burning
        if (isBurning(burnable)) {
          return {
            valid: false,
            error: BurnMessages.ALREADY_BURNING
          };
        }
        // Check if burned out
        if (isBurnedOut(burnable)) {
          return {
            valid: false,
            error: BurnMessages.BURNED_OUT
          };
        }
        context.sharedData.burnTarget = burnable;
        return { valid: true };
      }
      return {
        valid: false,
        error: BurnMessages.NO_TARGET
      };
    }

    // Check if target is in scope
    const targetEntity = directObject.entity;
    if (!targetEntity) {
      return {
        valid: false,
        error: BurnMessages.NOT_VISIBLE
      };
    }

    // Check if target is incense
    if (!isIncense(targetEntity)) {
      return {
        valid: false,
        error: BurnMessages.CANT_BURN,
        params: { target: directObject.text }
      };
    }

    // Check if already burning
    if (isBurning(targetEntity)) {
      return {
        valid: false,
        error: BurnMessages.ALREADY_BURNING
      };
    }

    // Check if burned out
    if (isBurnedOut(targetEntity)) {
      return {
        valid: false,
        error: BurnMessages.BURNED_OUT
      };
    }

    // Store target for execute phase
    context.sharedData.burnTarget = targetEntity;
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world, sharedData } = context;

    const target = sharedData.burnTarget as IFEntity;
    if (!target) {
      return;
    }

    // Set incense to burning state
    // The fuse will be registered separately
    (target as any).isBurning = true;

    // Store incense ID for the fuse registration
    world.setStateValue('dungeo.incense.burning_id', target.id);

    sharedData.incenseId = target.id;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: BURN_ACTION_ID,
      messageId: result.error || BurnMessages.NO_TARGET,
      reason: result.error,
      params: result.params
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const { sharedData } = context;
    const events: ISemanticEvent[] = [];

    const target = sharedData.burnTarget as IFEntity;
    if (!target) {
      return events;
    }

    const identity = target.get(IdentityTrait);
    const targetName = identity?.name || 'item';

    // Emit the burn event
    events.push(context.event('game.message', {
      messageId: BurnMessages.BURN_INCENSE,
      target: targetName,
      incenseId: sharedData.incenseId
    }));

    return events;
  }
};
