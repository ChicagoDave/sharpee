/**
 * Press Button Action - Story-specific action for maintenance room buttons
 *
 * Per FORTRAN source:
 * - Yellow: Enables bolt (GATEF=TRUE) - emits dungeo.button.yellow.pressed
 * - Brown: Disables bolt (GATEF=FALSE) - emits dungeo.button.brown.pressed
 * - Red: Toggles room lights
 * - Blue: Starts flooding (death trap)
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IFEntity, RoomTrait, ButtonTrait, TraitType } from '@sharpee/world-model';
import { PRESS_BUTTON_ACTION_ID, PressButtonMessages } from './types';
import { DAM_STATE_KEY, DamState, startFlooding, FloodingMessages } from '../../scheduler/dam-fuse';

// Scheduler reference for flooding
let schedulerRef: any = null;
let maintenanceRoomIdRef: string = '';
let leakIdRef: string | undefined = undefined;

/**
 * Set the scheduler reference for starting flooding sequence
 */
export function setPressButtonScheduler(scheduler: any, maintenanceRoomId: string, leakId?: string): void {
  schedulerRef = scheduler;
  maintenanceRoomIdRef = maintenanceRoomId;
  leakIdRef = leakId;
}

/**
 * Check if an entity is a button (has ButtonTrait with color)
 */
function isButton(entity: IFEntity): boolean {
  const buttonTrait = entity.get(TraitType.BUTTON) as ButtonTrait | undefined;
  return buttonTrait?.color !== undefined;
}

/**
 * Get button color from ButtonTrait
 */
function getButtonColor(entity: IFEntity): string | undefined {
  const buttonTrait = entity.get(TraitType.BUTTON) as ButtonTrait | undefined;
  return buttonTrait?.color;
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
      damState = { isDraining: false, isDrained: false, buttonPressed: false, floodingLevel: 0, isFlooded: false };
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
        // Start flooding (death trap!)
        if (schedulerRef && maintenanceRoomIdRef) {
          const floodingEvents = startFlooding(
            schedulerRef,
            world as any,
            maintenanceRoomIdRef,
            leakIdRef
          );
          // Check if flooding started or button was jammed
          const eventData = floodingEvents[0]?.data as { messageId?: string } | undefined;
          if (floodingEvents.length > 0 && eventData?.messageId === FloodingMessages.BUTTON_JAMMED) {
            sharedData.resultMessage = FloodingMessages.BUTTON_JAMMED;
          } else {
            sharedData.resultMessage = FloodingMessages.LEAK_STARTED;
            sharedData.floodingEvents = floodingEvents;
          }
        } else {
          // No scheduler configured, show jammed message
          sharedData.resultMessage = PressButtonMessages.BLUE_JAMMED;
        }
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
