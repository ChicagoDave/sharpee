/**
 * Falls Death Action
 *
 * Triggered when player performs any action except LOOK at Aragain Falls.
 * Per Mainframe Zork Fortran source - immediate death.
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { FALLS_DEATH_ACTION_ID, FallsDeathMessages } from './types';

// Event ID counter
let eventCounter = 0;
function generateEventId(): string {
  return `falls-death-${Date.now()}-${++eventCounter}`;
}

export const fallsDeathAction: Action = {
  id: FALLS_DEATH_ACTION_ID,
  group: 'special',

  validate(_context: ActionContext): ValidationResult {
    // Always valid - death is inevitable
    return { valid: true };
  },

  execute(context: ActionContext): void {
    // Mark player as dead
    context.world.setStateValue('dungeo.player.dead', true);
    context.world.setStateValue('dungeo.player.death_cause', 'falls');
  },

  blocked(_context: ActionContext, _result: ValidationResult): ISemanticEvent[] {
    return [];
  },

  report(context: ActionContext): ISemanticEvent[] {
    // Domain event with messageId - no action.success needed
    return [
      context.event('if.event.player.died', {
        messageId: FallsDeathMessages.DEATH,
        cause: 'aragain_falls'
      })
    ];
  }
};
