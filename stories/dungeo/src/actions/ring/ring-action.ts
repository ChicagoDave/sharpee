/**
 * Ring Action - Story-specific action for ringing items
 *
 * Used primarily for the brass bell in the exorcism ritual.
 * Pattern: "ring bell", "ring :target"
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait, IFEntity } from '@sharpee/world-model';
import { RING_ACTION_ID, RingMessages } from './types';

/**
 * Check if an entity is ringable (currently just the bell)
 */
function isRingable(entity: IFEntity): boolean {
  const identity = entity.get(IdentityTrait);
  if (!identity) return false;

  const name = identity.name?.toLowerCase() || '';
  const aliases = identity.aliases || [];

  // Check if it's a bell
  return name.includes('bell') || aliases.some((a: string) => a.toLowerCase().includes('bell'));
}

/**
 * Find the bell entity
 */
function findBell(context: ActionContext): IFEntity | undefined {
  const { world, player } = context;

  // Check player inventory
  const inventory = world.getContents(player.id);
  for (const item of inventory) {
    if (isRingable(item)) {
      return item;
    }
  }

  // Check current room
  const playerLocation = world.getLocation(player.id);
  if (playerLocation) {
    const roomContents = world.getContents(playerLocation);
    for (const item of roomContents) {
      if (isRingable(item)) {
        return item;
      }
    }
  }

  return undefined;
}

/**
 * Get the direct object from context
 */
function getDirectObject(context: ActionContext): { entity?: IFEntity; text?: string } | undefined {
  const structure = context.command.parsed?.structure;
  if (!structure?.directObject) {
    return undefined;
  }

  // Try to find entity by name
  const text = structure.directObject.text || '';
  const entity = context.world.getAllEntities().find(e => {
    const identity = e.get(IdentityTrait);
    if (!identity) return false;
    const name = identity.name?.toLowerCase() || '';
    const aliases = identity.aliases || [];
    const lowerText = text.toLowerCase();
    return name === lowerText || aliases.some((a: string) => a.toLowerCase() === lowerText);
  });

  return { entity, text };
}

/**
 * Ring Action Definition
 */
export const ringAction: Action = {
  id: RING_ACTION_ID,
  group: 'manipulation',

  validate(context: ActionContext): ValidationResult {
    const directObject = getDirectObject(context);

    // If no target specified, try to find the bell
    if (!directObject || !directObject.text) {
      const bell = findBell(context);
      if (bell) {
        // Store the bell for execute phase
        context.sharedData.ringTarget = bell;
        return { valid: true };
      }
      return {
        valid: false,
        error: RingMessages.NO_TARGET
      };
    }

    // Check if target is in scope
    const targetEntity = directObject.entity;
    if (!targetEntity) {
      return {
        valid: false,
        error: 'stdlib.errors.not_visible'
      };
    }

    // Check if target is ringable
    if (!isRingable(targetEntity)) {
      return {
        valid: false,
        error: RingMessages.NOT_RINGABLE
      };
    }

    // Store target for execute phase
    context.sharedData.ringTarget = targetEntity;
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world, player, sharedData } = context;

    const target = sharedData.ringTarget as IFEntity;
    if (!target) {
      return;
    }

    const playerLocation = world.getLocation(player.id) || '';

    // Check if this is the exorcism bell
    const isExorcismBell = target.attributes?.exorcismRole === 'bell';

    // Mark that bell was rung (for exorcism tracking)
    if (isExorcismBell) {
      // Store in world state that bell was rung at this location
      world.setStateValue('dungeo.exorcism.bell_rung_location', playerLocation);
      world.setStateValue('dungeo.exorcism.bell_rung_turn', Date.now());
    }

    // Store for report phase
    sharedData.isExorcismBell = isExorcismBell;
    sharedData.playerLocation = playerLocation;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: RING_ACTION_ID,
      messageId: result.error || RingMessages.NO_TARGET,
      reason: result.error
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const { player, sharedData } = context;
    const events: ISemanticEvent[] = [];

    const target = sharedData.ringTarget as IFEntity;
    if (!target) {
      return events;
    }

    const identity = target.get(IdentityTrait);
    const targetName = identity?.name || 'item';
    const isExorcismBell = sharedData.isExorcismBell;
    const playerLocation = sharedData.playerLocation;

    // Emit the ring event
    events.push(context.event('game.message', {
      messageId: isExorcismBell ? RingMessages.RING_BELL : RingMessages.RING_SUCCESS,
      target: targetName,
      isExorcismItem: isExorcismBell,
      location: playerLocation
    }));

    return events;
  }
};
