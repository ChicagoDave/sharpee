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

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { GRUE_DEATH_ACTION_ID, GrueDeathMessages } from './types';

// Event ID counter
let eventCounter = 0;
function generateEventId(): string {
  return `grue-death-${Date.now()}-${++eventCounter}`;
}

export const grueDeathAction: Action = {
  id: GRUE_DEATH_ACTION_ID,
  group: 'special',

  validate(_context: ActionContext): ValidationResult {
    // Always valid - death is inevitable when triggered
    return { valid: true };
  },

  execute(context: ActionContext): void {
    // Mark player as dead
    context.world.setStateValue('dungeo.player.dead', true);
    context.world.setStateValue('dungeo.player.death_cause', 'grue');
  },

  blocked(_context: ActionContext, _result: ValidationResult): ISemanticEvent[] {
    return [];
  },

  report(context: ActionContext): ISemanticEvent[] {
    // Get the death type from extras (set by transformer)
    const deathType = context.command.parsed.extras?.grueDeathType || 'walked_into';
    const messageId = deathType === 'slithered'
      ? GrueDeathMessages.SLITHERED_INTO_ROOM
      : GrueDeathMessages.WALKED_INTO_GRUE;

    // Domain event with messageId - no action.success needed
    return [
      context.event('if.event.player.died', {
        messageId: messageId,
        cause: 'grue',
        deathType: deathType
      })
    ];
  }
};
