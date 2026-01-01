/**
 * Lower Action - Story-specific action for lowering objects
 *
 * Used for lowering the short pole in the Inside Mirror puzzle.
 *
 * Pattern: "lower pole", "drop pole", "lower short pole"
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait, IFEntity } from '@sharpee/world-model';
import { LOWER_ACTION_ID, LowerMessages } from './types';
import { lowerPole, getMirrorState } from '../../handlers/inside-mirror-handler';

// Pole states
const POLE_LOWERED = 0;

/**
 * Check if an entity is the short pole
 */
function isShortPole(entity: IFEntity): boolean {
  return (entity as any).poleType === 'short';
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
 * Find the short pole in current location
 */
function findShortPole(context: ActionContext): IFEntity | undefined {
  const { world, player } = context;

  const playerLocation = world.getLocation(player.id);
  if (!playerLocation) return undefined;

  const roomContents = world.getContents(playerLocation);
  for (const item of roomContents) {
    if (isShortPole(item)) {
      return item;
    }
  }

  return undefined;
}

/**
 * Lower Action Definition
 */
export const lowerAction: Action = {
  id: LOWER_ACTION_ID,
  group: 'manipulation',

  validate(context: ActionContext): ValidationResult {
    const { world, player } = context;
    const directObject = getDirectObject(context);

    // Check if we're in a location with the mirror
    const insideMirrorId = world.getStateValue('endgame.insideMirrorId') as string | undefined;
    const playerLocation = world.getLocation(player.id);

    if (playerLocation !== insideMirrorId) {
      return {
        valid: false,
        error: LowerMessages.NOT_IN_MIRROR
      };
    }

    // If no target specified, try to find short pole
    if (!directObject || !directObject.text) {
      const pole = findShortPole(context);
      if (pole) {
        // Check if already lowered
        const state = getMirrorState(world);
        if (state.poleState === POLE_LOWERED) {
          return {
            valid: false,
            error: LowerMessages.POLE_ALREADY_LOWERED
          };
        }
        context.sharedData.lowerTarget = pole;
        return { valid: true };
      }
      return {
        valid: false,
        error: LowerMessages.NO_TARGET
      };
    }

    // Check if target is in scope
    const targetEntity = directObject.entity;
    if (!targetEntity) {
      return {
        valid: false,
        error: LowerMessages.NOT_VISIBLE
      };
    }

    // Check if target is the short pole
    if (!isShortPole(targetEntity)) {
      return {
        valid: false,
        error: LowerMessages.CANT_LOWER,
        params: { target: directObject.text }
      };
    }

    // Check if already lowered
    const state = getMirrorState(world);
    if (state.poleState === POLE_LOWERED) {
      return {
        valid: false,
        error: LowerMessages.POLE_ALREADY_LOWERED
      };
    }

    // Store target for execute phase
    context.sharedData.lowerTarget = targetEntity;
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world, sharedData } = context;

    const target = sharedData.lowerTarget as IFEntity;
    if (!target) {
      return;
    }

    // Lower the pole
    const result = lowerPole(world);
    sharedData.lowerResult = result;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: LOWER_ACTION_ID,
      messageId: result.error || LowerMessages.NO_TARGET,
      reason: result.error,
      params: result.params
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const { sharedData } = context;
    const events: ISemanticEvent[] = [];

    const result = sharedData.lowerResult as { success: boolean; message: string } | undefined;
    if (!result || !result.success) {
      return events;
    }

    // Emit the lower event
    events.push(context.event('if.event.lowered', {
      messageId: result.message,
      targetId: (sharedData.lowerTarget as IFEntity)?.id
    }));

    return events;
  }
};
