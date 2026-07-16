/**
 * Falls Death Action
 *
 * Triggered when player performs any action except LOOK at Aragain Falls.
 * Per Mainframe Zork Fortran source - immediate death.
 */

import { Action, ActionContext, ValidationResult, killPlayer } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { FALLS_DEATH_ACTION_ID, FallsDeathMessages } from './types';

export const fallsDeathAction: Action = {
  id: FALLS_DEATH_ACTION_ID,
  group: 'special',

  validate(_context: ActionContext): ValidationResult {
    // Always valid - death is inevitable
    return { valid: true };
  },

  execute(context: ActionContext): void {
    // Canonical terminal death (ADR-224): kill via the platform primitive,
    // stash the event for report(). No hand-rolled dead flag.
    (context.sharedData as { deathEvent?: ISemanticEvent | null }).deathEvent =
      killPlayer(context.world, context.player, {
        cause: 'aragain_falls',
        messageId: FallsDeathMessages.DEATH,
        terminal: true,
      });
  },

  blocked(_context: ActionContext, _result: ValidationResult): ISemanticEvent[] {
    return [];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const event = (context.sharedData as { deathEvent?: ISemanticEvent | null }).deathEvent;
    return event ? [event] : [];
  }
};
