/**
 * Rname Action
 *
 * Prints only the short description (name) of the current room.
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { RNAME_ACTION_ID } from './types';

export const rnameAction: Action = {
  id: RNAME_ACTION_ID,
  group: 'observation',

  validate(context: ActionContext): ValidationResult {
    return { valid: true };
  },

  execute(context: ActionContext): void {
    // No mutations needed
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: this.id,
      messageId: result.error,
      reason: result.error,
      params: result.params || {}
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const { world, player } = context;

    const room = world.getContainingRoom(player.id);
    if (!room) {
      return events;
    }

    // Emit room name event
    events.push(context.event('dungeo.event.rname', {
      roomId: room.id,
      roomName: room.name,
    }));

    return events;
  }
};
