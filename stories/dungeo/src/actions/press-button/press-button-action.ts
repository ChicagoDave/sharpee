/**
 * Press Button Action - Story-specific action for maintenance room buttons
 *
 * Per FORTRAN source:
 * - Yellow: Enables bolt (GATEF=TRUE) - emits dungeo.button.yellow.pressed
 * - Brown: Disables bolt (GATEF=FALSE) - emits dungeo.button.brown.pressed
 * - Red: Toggles room lights
 * - Blue: Starts flooding (death trap) - Phase 2
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait, IFEntity, RoomTrait } from '@sharpee/world-model';
import { PRESS_BUTTON_ACTION_ID, PressButtonMessages } from './types';
import { DAM_STATE_KEY, DamState } from '../../scheduler/dam-fuse';

/**
 * Check if an entity is a button
 */
function isButton(entity: IFEntity): boolean {
  return (entity as any).buttonColor !== undefined;
}

/**
 * Get button color
 */
function getButtonColor(entity: IFEntity): string | undefined {
  return (entity as any).buttonColor;
}

/**
 * Press Button Action Definition
 */
export const pressButtonAction: Action = {
  id: PRESS_BUTTON_ACTION_ID,
  group: 'manipulation',

  validate(context: ActionContext): ValidationResult {
    const target = context.command.directObject?.entity;

    if (!target) {
      return {
        valid: false,
        error: PressButtonMessages.NOT_A_BUTTON
      };
    }

    // Check if it's a button
    if (!isButton(target)) {
      return {
        valid: false,
        error: PressButtonMessages.NOT_A_BUTTON
      };
    }

    // Store target for execute phase
    context.sharedData.buttonTarget = target;
    context.sharedData.buttonColor = getButtonColor(target);

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world, sharedData } = context;

    const buttonColor = sharedData.buttonColor as string;
    const target = sharedData.buttonTarget as IFEntity;

    if (!buttonColor || !target) {
      return;
    }

    // Get or create dam state
    let damState = world.getCapability(DAM_STATE_KEY) as DamState | null;
    if (!damState) {
      damState = { isDraining: false, isDrained: false, buttonPressed: false };
      world.registerCapability(DAM_STATE_KEY, { initialData: damState });
    }

    switch (buttonColor) {
      case 'yellow':
        // Enable bolt (GATEF=TRUE)
        damState.buttonPressed = true;
        sharedData.resultMessage = PressButtonMessages.CLICK;
        break;

      case 'brown':
        // Disable bolt (GATEF=FALSE)
        damState.buttonPressed = false;
        sharedData.resultMessage = PressButtonMessages.CLICK;
        break;

      case 'red':
        // Toggle room lights
        const playerLocation = world.getLocation(context.player.id);
        if (playerLocation) {
          const room = world.getEntity(playerLocation);
          if (room) {
            const roomTrait = room.get(RoomTrait);
            if (roomTrait) {
              const wasLight = !roomTrait.isDark;
              roomTrait.isDark = wasLight; // Toggle
              sharedData.resultMessage = wasLight
                ? PressButtonMessages.LIGHTS_OFF
                : PressButtonMessages.LIGHTS_ON;
            }
          }
        }
        break;

      case 'blue':
        // Phase 2: Flooding - for now just show jammed message
        // TODO: Implement flooding daemon
        sharedData.resultMessage = PressButtonMessages.BLUE_JAMMED;
        break;

      default:
        sharedData.resultMessage = PressButtonMessages.CLICK;
    }
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: PRESS_BUTTON_ACTION_ID,
      messageId: result.error || PressButtonMessages.NOT_A_BUTTON,
      reason: result.error
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const { sharedData } = context;
    const events: ISemanticEvent[] = [];

    const messageId = sharedData.resultMessage || PressButtonMessages.CLICK;
    const buttonColor = sharedData.buttonColor || 'unknown';

    events.push(context.event('game.message', {
      messageId,
      buttonColor
    }));

    return events;
  }
};
