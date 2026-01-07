/**
 * River Blocked Action
 *
 * Displayed when player tries to enter river rooms without an inflated boat.
 * Per Mainframe Zork Fortran source - water rooms require the rubber boat.
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { RIVER_BLOCKED_ACTION_ID, RiverBlockedMessages } from './types';

// Event ID counter
let eventCounter = 0;
function generateEventId(): string {
  return `river-blocked-${Date.now()}-${++eventCounter}`;
}

export const riverBlockedAction: Action = {
  id: RIVER_BLOCKED_ACTION_ID,
  group: 'movement',

  validate(_context: ActionContext): ValidationResult {
    // Always "fails" validation to show the blocking message
    return {
      valid: false,
      error: RiverBlockedMessages.NO_BOAT
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
        messageId: RiverBlockedMessages.NO_BOAT
      },
      narrate: true
    }];
  },

  report(_context: ActionContext): ISemanticEvent[] {
    return [];
  }
};
