/**
 * Lift Action - Story-specific action for lifting/raising objects
 *
 * Used for raising the short pole in the Inside Mirror puzzle.
 *
 * Pattern: "lift pole", "raise pole", "lift short pole"
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait, IFEntity } from '@sharpee/world-model';
import { LIFT_ACTION_ID, LiftMessages } from './types';
import { raisePole, getMirrorState } from '../../handlers/inside-mirror-handler';

// Pole states
const POLE_RAISED = 2;

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
 * Lift Action Definition
 */
export const liftAction: Action = {
  id: LIFT_ACTION_ID,
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
        error: LiftMessages.NOT_IN_MIRROR
      };
    }

    // If no target specified, try to find short pole
    if (!directObject || !directObject.text) {
      const pole = findShortPole(context);
      if (pole) {
        // Check if already raised
        const state = getMirrorState(world);
        if (state.poleState === POLE_RAISED) {
          return {
            valid: false,
            error: LiftMessages.POLE_ALREADY_RAISED
          };
        }
        context.sharedData.liftTarget = pole;
        return { valid: true };
      }
      return {
        valid: false,
        error: LiftMessages.NO_TARGET
      };
    }

    // Check if target is in scope
    const targetEntity = directObject.entity;
    if (!targetEntity) {
      return {
        valid: false,
        error: LiftMessages.NOT_VISIBLE
      };
    }

    // Check if target is the short pole
    if (!isShortPole(targetEntity)) {
      return {
        valid: false,
        error: LiftMessages.CANT_LIFT,
        params: { target: directObject.text }
      };
    }

    // Check if already raised
    const state = getMirrorState(world);
    if (state.poleState === POLE_RAISED) {
      return {
        valid: false,
        error: LiftMessages.POLE_ALREADY_RAISED
      };
    }

    // Store target for execute phase
    context.sharedData.liftTarget = targetEntity;
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world, sharedData } = context;

    const target = sharedData.liftTarget as IFEntity;
    if (!target) {
      return;
    }

    // Raise the pole
    const result = raisePole(world);
    sharedData.liftResult = result;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: LIFT_ACTION_ID,
      messageId: result.error || LiftMessages.NO_TARGET,
      reason: result.error,
      params: result.params
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const { sharedData } = context;
    const events: ISemanticEvent[] = [];

    const result = sharedData.liftResult as { success: boolean; message: string } | undefined;
    if (!result || !result.success) {
      return events;
    }

    // Emit the lift event
    events.push(context.event('if.event.lifted', {
      messageId: result.message,
      targetId: (sharedData.liftTarget as IFEntity)?.id
    }));

    return events;
  }
};
