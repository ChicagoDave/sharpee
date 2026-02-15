/**
 * Wave Action - Wave items to produce effects
 *
 * Primary use: Wave the sharp stick at Aragain Falls to create/dismiss rainbow
 * Pattern: "wave stick", "wave :target"
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait, IFEntity } from '@sharpee/world-model';
import { WAVE_ACTION_ID, WaveMessages } from './types';
import { RAINBOW_SOLIDIFIED_EVENT, RAINBOW_DISMISSED_EVENT } from '../../state-machines/rainbow-machine';

// Room name patterns where waving the stick has effect
const FALLS_ROOM_PATTERNS = ['aragain falls', 'on the rainbow', 'end of rainbow', 'rainbow'];

/**
 * Check if entity is the sharp stick (rainbow item)
 * The stick has isSceptre flag set in dam.ts for this purpose
 */
function isRainbowStick(entity: IFEntity): boolean {
  // Check the flag first (set in dam.ts)
  if (entity.attributes?.isSceptre) return true;

  // Fallback: check name/aliases
  const identity = entity.get(IdentityTrait);
  if (!identity) return false;

  const name = identity.name?.toLowerCase() || '';
  return name.includes('stick') || name.includes('sharp stick');
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
    context.sharedData.isStick = isRainbowStick(target);
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world, player, sharedData } = context;

    const target = sharedData.waveTarget as IFEntity;
    const isStickTarget = sharedData.isStick as boolean;

    const playerLocation = world.getLocation(player.id) || '';
    sharedData.playerLocation = playerLocation;

    // Check room name for falls location
    const room = world.getEntity(playerLocation);
    const roomIdentity = room?.get(IdentityTrait);
    const roomName = roomIdentity?.name?.toLowerCase() || '';
    const isAtFalls = FALLS_ROOM_PATTERNS.some(pattern =>
      roomName.includes(pattern) || playerLocation.toLowerCase().includes(pattern.replace(/\s+/g, '-'))
    );

    // Check if waving stick at falls
    if (isStickTarget && isAtFalls) {
      // Toggle rainbow state — emit event for state machine to handle exit manipulation
      const rainbowActive = (world.getStateValue('dungeo.rainbow.active') as boolean) || false;

      if (rainbowActive) {
        sharedData.rainbowDismissed = true;
        sharedData.rainbowEvent = RAINBOW_DISMISSED_EVENT;
      } else {
        sharedData.rainbowCreated = true;
        sharedData.rainbowEvent = RAINBOW_SOLIDIFIED_EVENT;
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
      events.push(context.event(RAINBOW_SOLIDIFIED_EVENT, {}));
      events.push(context.event('game.message', {
        messageId: WaveMessages.RAINBOW_APPEARS,
        params: { target: targetName }
      }));
    } else if (sharedData.rainbowDismissed) {
      events.push(context.event(RAINBOW_DISMISSED_EVENT, {}));
      events.push(context.event('game.message', {
        messageId: WaveMessages.RAINBOW_GONE,
        params: { target: targetName }
      }));
    } else if (sharedData.isStick) {
      // Waved stick but not at falls
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
