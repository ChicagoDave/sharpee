/**
 * Grue Death Action
 *
 * Triggered when player attempts to move in a dark room and fails
 * the survival roll (75% death chance per FORTRAN source).
 *
 * Per FORTRAN verbs.f (WALK function):
 * - Death 522: "walked into the slavering fangs of a lurking grue"
 * - Death 523: "a lurking grue slithered into the room"
 */

import { Action, ActionContext, ValidationResult, killPlayer } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { GRUE_DEATH_ACTION_ID, GrueDeathMessages } from './types';

export const grueDeathAction: Action = {
  id: GRUE_DEATH_ACTION_ID,
  group: 'special',

  validate(_context: ActionContext): ValidationResult {
    // Always valid - death is inevitable when triggered
    return { valid: true };
  },

  execute(context: ActionContext): void {
    // The 75%/25% survival roll happens upstream (grue-handler); by the time this
    // action runs, death is decided. Apply canonical terminal death (ADR-224).
    // Death text depends on how the grue struck; resolve the messageId here.
    const deathType = context.command.parsed.extras?.grueDeathType || 'walked_into';
    const messageId = deathType === 'slithered'
      ? GrueDeathMessages.SLITHERED_INTO_ROOM
      : GrueDeathMessages.WALKED_INTO_GRUE;

    (context.sharedData as { deathEvent?: ISemanticEvent | null }).deathEvent =
      killPlayer(context.world, context.player, {
        cause: 'grue',
        messageId,
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
