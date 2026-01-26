/**
 * Wind Action - Wind clockwork items
 *
 * Primary use: Wind the canary in a forest location to make it sing
 * and reveal the brass bauble (2 points total).
 * Pattern: "wind canary", "wind :target"
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait, IFEntity, EntityType } from '@sharpee/world-model';
import { WIND_ACTION_ID, WindMessages } from './types';
import { TreasureTrait } from '../../traits';

// Room patterns that count as "forest"
const FOREST_PATTERNS = ['forest', 'clearing', 'path'];

/**
 * Check if entity is the canary
 */
function isCanary(entity: IFEntity): boolean {
  const identity = entity.get(IdentityTrait);
  if (!identity) return false;

  const name = identity.name?.toLowerCase() || '';
  const aliases = identity.aliases || [];

  return name.includes('canary') ||
    aliases.some((a: string) => a.toLowerCase().includes('canary'));
}

/**
 * Check if player is holding an entity
 */
function isHolding(context: ActionContext, entity: IFEntity): boolean {
  const inventory = context.world.getContents(context.player.id);
  return inventory.some(item => item.id === entity.id);
}

/**
 * Check if location is in a forest
 */
function isInForest(context: ActionContext): boolean {
  const { world, player } = context;
  const locationId = world.getLocation(player.id) || '';
  const room = world.getEntity(locationId);

  if (!room) return false;

  const identity = room.get(IdentityTrait);
  const roomName = identity?.name?.toLowerCase() || '';

  return FOREST_PATTERNS.some(pattern =>
    locationId.toLowerCase().includes(pattern) ||
    roomName.includes(pattern)
  );
}

/**
 * Get target from command
 */
function getTarget(context: ActionContext): IFEntity | undefined {
  const structure = context.command.parsed?.structure;
  if (!structure?.directObject) {
    return undefined;
  }

  // Get the text and find matching entity
  const text = structure.directObject.text || '';
  if (!text) return undefined;

  const entity = context.world.getAllEntities().find(e => {
    const identity = e.get(IdentityTrait);
    if (!identity) return false;
    const name = identity.name?.toLowerCase() || '';
    const aliases = identity.aliases || [];
    const lowerText = text.toLowerCase();
    return name === lowerText || name.includes(lowerText) ||
      aliases.some((a: string) => a.toLowerCase() === lowerText || a.toLowerCase().includes(lowerText));
  });

  return entity;
}

export const windAction: Action = {
  id: WIND_ACTION_ID,
  group: 'manipulation',

  validate(context: ActionContext): ValidationResult {
    const target = getTarget(context);

    if (!target) {
      return {
        valid: false,
        error: WindMessages.NO_TARGET
      };
    }

    // Must be holding the item
    if (!isHolding(context, target)) {
      return {
        valid: false,
        error: WindMessages.NOT_HOLDING
      };
    }

    // Must be the canary (or another windable item)
    if (!isCanary(target)) {
      return {
        valid: false,
        error: WindMessages.NOT_WINDABLE
      };
    }

    context.sharedData.windTarget = target;
    context.sharedData.isCanary = true;
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world, player, sharedData } = context;

    const isCanaryTarget = sharedData.isCanary as boolean;

    if (!isCanaryTarget) {
      return;
    }

    // Check if canary was already wound to produce bauble
    const baubleProduced = (world.getStateValue('dungeo.canary.bauble_produced') as boolean) || false;
    if (baubleProduced) {
      sharedData.alreadyWound = true;
      return;
    }

    // Canary can be wound anywhere, but bauble only appears in forest
    const inForest = isInForest(context);
    sharedData.inForest = inForest;

    if (inForest) {
      // Produce the bauble!
      world.setStateValue('dungeo.canary.bauble_produced', true);
      world.setStateValue('dungeo.bauble.revealed', true);
      sharedData.baubleAppeared = true;

      // Create the brass bauble and drop it at the player's feet
      const playerLocation = world.getLocation(player.id);
      if (playerLocation) {
        const bauble = world.createEntity('brass bauble', EntityType.ITEM);
        bauble.add(new IdentityTrait({
          name: 'brass bauble',
          aliases: ['bauble', 'shiny bauble', 'brass ball', 'ball'],
          description: 'A shiny brass bauble, dropped by an unseen songbird in response to the canary\'s tune.',
          properName: false,
          article: 'a'
        }));
        // Treasure scoring (1 take + 1 case = 2 points)
        bauble.add(new TreasureTrait({
          treasureId: 'brass-bauble',
          treasureValue: 1,      // OFVAL from mdlzork_810722
          trophyCaseValue: 1,    // OTVAL from mdlzork_810722
        }));
        world.moveEntity(bauble.id, playerLocation);
      }
    }
    // Otherwise canary just sings (no bauble)
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: WIND_ACTION_ID,
      messageId: result.error || WindMessages.NO_TARGET,
      reason: result.error
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const { sharedData } = context;
    const events: ISemanticEvent[] = [];

    const target = sharedData.windTarget as IFEntity;
    if (!target) return events;

    const identity = target.get(IdentityTrait);
    const targetName = identity?.name || 'item';

    if (sharedData.alreadyWound) {
      events.push(context.event('game.message', {
        messageId: WindMessages.ALREADY_WOUND,
        params: { target: targetName }
      }));
    } else if (sharedData.baubleAppeared) {
      // Canary sings and bauble appears
      events.push(context.event('game.message', {
        messageId: WindMessages.BAUBLE_APPEARS,
        params: { target: targetName }
      }));
    } else if (sharedData.isCanary) {
      // Canary sings but no bauble (not in forest)
      events.push(context.event('game.message', {
        messageId: WindMessages.CANARY_SINGS,
        params: { target: targetName }
      }));
    } else {
      events.push(context.event('game.message', {
        messageId: WindMessages.SUCCESS,
        params: { target: targetName }
      }));
    }

    return events;
  }
};
