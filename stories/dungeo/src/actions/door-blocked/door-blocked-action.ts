/**
 * Door Blocked Action (Tiny Room puzzle)
 *
 * Shows blocking message when player tries to go north through locked door.
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { DOOR_BLOCKED_ACTION_ID, DoorBlockedMessages } from './types';

// Event ID counter
let eventCounter = 0;
function generateEventId(): string {
  return `door-blocked-${Date.now()}-${++eventCounter}`;
}

export const doorBlockedAction: Action = {
  id: DOOR_BLOCKED_ACTION_ID,
  group: 'movement',

  validate(_context: ActionContext): ValidationResult {
    // Always "fails" validation to show the blocking message
    return {
      valid: false,
      error: DoorBlockedMessages.DOOR_LOCKED
    };
  },

  execute(_context: ActionContext): void {
    // Never called since validate always fails
  },

  blocked(_context: ActionContext, _result: ValidationResult): ISemanticEvent[] {
    return [{
      id: generateEventId(),
      type: 'game.message',
      timestamp: Date.now(),
      entities: {},
      data: {
        messageId: DoorBlockedMessages.DOOR_LOCKED,
        message: 'The door is locked, and there is no keyhole on this side.'
      },
      narrate: true
    }];
  },

  report(_context: ActionContext): ISemanticEvent[] {
    return [];
  }
};
