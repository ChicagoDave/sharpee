/**
 * SET DIAL Action - Set the Parapet sundial to a number 1-8
 *
 * Pattern: "set dial to 4", "turn dial to 6", "turn indicator to 8"
 *
 * The sundial at the Parapet controls which prison cell is
 * rotated into the accessible position around the fiery pit.
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait } from '@sharpee/world-model';
import { SET_DIAL_ACTION_ID, SetDialMessages } from './types';

/**
 * Check if the player is at the Parapet
 */
function isAtParapet(context: ActionContext): boolean {
  const { world, player } = context;
  const playerLocation = world.getLocation(player.id);
  if (!playerLocation) return false;

  const room = world.getEntity(playerLocation);
  if (!room) return false;

  const identity = room.get(IdentityTrait);
  return identity?.name === 'Parapet';
}

/**
 * Parse dial value from command text slots
 */
function getDialValue(context: ActionContext): number | null {
  const { command } = context;

  // Check textSlots via parsed (ADR-080 text capture)
  const textSlots = command.parsed?.textSlots;
  if (textSlots && textSlots.size > 0) {
    const numberText = textSlots.get('number');
    if (numberText) {
      const num = parseInt(numberText, 10);
      if (!isNaN(num)) return num;
    }
  }

  // Fallback: extract from raw input
  const rawInput = (command as any).rawInput || '';
  const match = rawInput.match(/(?:set|turn)\s+(?:dial|indicator)\s+to\s+(\d+)/i);
  if (match) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num)) return num;
  }

  return null;
}

/**
 * SET DIAL Action Definition
 */
export const setDialAction: Action = {
  id: SET_DIAL_ACTION_ID,
  group: 'manipulation',

  validate(context: ActionContext): ValidationResult {
    const atParapet = isAtParapet(context);
    context.sharedData.atParapet = atParapet;

    if (!atParapet) {
      return {
        valid: false,
        error: SetDialMessages.NOT_AT_PARAPET
      };
    }

    const dialValue = getDialValue(context);
    context.sharedData.dialValue = dialValue;

    if (dialValue === null || dialValue < 1 || dialValue > 8) {
      return {
        valid: false,
        error: SetDialMessages.DIAL_MUST_BE_1_TO_8
      };
    }

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world, sharedData } = context;
    const dialValue = sharedData.dialValue as number;

    // Store previous value for reporting
    const previousValue = (world.getStateValue('parapet.dialSetting') as number) ?? 1;
    sharedData.previousDialValue = previousValue;

    // Set the new dial value
    world.setStateValue('parapet.dialSetting', dialValue);
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [
      context.event('action.blocked', {
        messageId: result.error || SetDialMessages.NOT_AT_PARAPET
      })
    ];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const { sharedData } = context;
    const dialValue = sharedData.dialValue as number;

    return [
      context.event('game.message', {
        messageId: SetDialMessages.SET_DIAL,
        params: { dialValue }
      })
    ];
  }
};
