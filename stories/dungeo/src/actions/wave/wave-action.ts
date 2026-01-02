/**
 * Wave Action - Wave items to produce effects
 *
 * Primary use: Wave the sceptre at Aragain Falls to create/dismiss rainbow
 * Pattern: "wave sceptre", "wave :target"
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait, IFEntity } from '@sharpee/world-model';
import { WAVE_ACTION_ID, WaveMessages } from './types';

// Room name patterns where waving the sceptre has effect
const FALLS_ROOM_PATTERNS = ['aragain falls', 'on the rainbow', 'end of rainbow', 'rainbow'];

/**
 * Check if entity is the sceptre
 */
function isSceptre(entity: IFEntity): boolean {
  const identity = entity.get(IdentityTrait);
  if (!identity) return false;

  const name = identity.name?.toLowerCase() || '';
  const aliases = identity.aliases || [];

  return name.includes('sceptre') || name.includes('scepter') ||
    aliases.some((a: string) => a.toLowerCase().includes('sceptre') || a.toLowerCase().includes('scepter'));
}

/**
 * Check if player is holding an entity
 */
function isHolding(context: ActionContext, entity: IFEntity): boolean {
  const inventory = context.world.getContents(context.player.id);
  return inventory.some(item => item.id === entity.id);
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

export const waveAction: Action = {
  id: WAVE_ACTION_ID,
  group: 'manipulation',

  validate(context: ActionContext): ValidationResult {
    const target = getTarget(context);

    if (!target) {
      return {
        valid: false,
        error: WaveMessages.NO_TARGET
      };
    }

    // Must be holding the item to wave it
    if (!isHolding(context, target)) {
      return {
        valid: false,
        error: WaveMessages.NOT_HOLDING
      };
    }

    context.sharedData.waveTarget = target;
    context.sharedData.isSceptre = isSceptre(target);
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world, player, sharedData } = context;

    const target = sharedData.waveTarget as IFEntity;
    const isSceptreTarget = sharedData.isSceptre as boolean;

    const playerLocation = world.getLocation(player.id) || '';
    sharedData.playerLocation = playerLocation;

    // Check room name for falls location
    const room = world.getEntity(playerLocation);
    const roomIdentity = room?.get(IdentityTrait);
    const roomName = roomIdentity?.name?.toLowerCase() || '';
    const isAtFalls = FALLS_ROOM_PATTERNS.some(pattern =>
      roomName.includes(pattern) || playerLocation.toLowerCase().includes(pattern.replace(/\s+/g, '-'))
    );

    // Check if waving sceptre at falls
    if (isSceptreTarget && isAtFalls) {
      // Toggle rainbow state
      const rainbowActive = (world.getStateValue('dungeo.rainbow.active') as boolean) || false;

      if (rainbowActive) {
        // Dismiss the rainbow
        world.setStateValue('dungeo.rainbow.active', false);
        sharedData.rainbowDismissed = true;

        // Remove exit from falls to rainbow
        // (The story's room connections should check this state)
      } else {
        // Create the rainbow
        world.setStateValue('dungeo.rainbow.active', true);
        sharedData.rainbowCreated = true;

        // Enable exit from falls to rainbow
        // (The story's room connections should check this state)
      }
    }
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: WAVE_ACTION_ID,
      messageId: result.error || WaveMessages.NO_TARGET,
      reason: result.error
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const { sharedData } = context;
    const events: ISemanticEvent[] = [];

    const target = sharedData.waveTarget as IFEntity;
    if (!target) return events;

    const identity = target.get(IdentityTrait);
    const targetName = identity?.name || 'item';

    if (sharedData.rainbowCreated) {
      events.push(context.event('game.message', {
        messageId: WaveMessages.RAINBOW_APPEARS,
        params: { target: targetName }
      }));
    } else if (sharedData.rainbowDismissed) {
      events.push(context.event('game.message', {
        messageId: WaveMessages.RAINBOW_GONE,
        params: { target: targetName }
      }));
    } else if (sharedData.isSceptre) {
      // Waved sceptre but not at falls
      events.push(context.event('game.message', {
        messageId: WaveMessages.NO_EFFECT,
        params: { target: targetName }
      }));
    } else {
      // Waved something else
      events.push(context.event('game.message', {
        messageId: WaveMessages.SUCCESS,
        params: { target: targetName }
      }));
    }

    return events;
  }
};
