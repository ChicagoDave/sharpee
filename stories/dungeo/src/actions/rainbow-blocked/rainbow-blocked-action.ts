/**
 * Rainbow Blocked Action
 *
 * Shows the blocking message when player tries to go west at Aragain Falls
 * before waving the sceptre to make the rainbow solid.
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { RAINBOW_BLOCKED_ACTION_ID, RainbowBlockedMessages } from './types';

// Event ID counter
let eventCounter = 0;
function generateEventId(): string {
  return `rainbow-blocked-${Date.now()}-${++eventCounter}`;
}

export const rainbowBlockedAction: Action = {
  id: RAINBOW_BLOCKED_ACTION_ID,
  group: 'movement',

  validate(_context: ActionContext): ValidationResult {
    // Always "fails" validation to show the blocking message
    return {
      valid: false,
      error: RainbowBlockedMessages.BLOCKED
    };
  },

  execute(_context: ActionContext): void {
    // Never called since validate always fails
  },

  blocked(_context: ActionContext, _result: ValidationResult): ISemanticEvent[] {
    // Return the blocking message as a game.message event
    // Using direct message field since messageId may not be registered
    return [{
      id: generateEventId(),
      type: 'game.message',
      timestamp: Date.now(),
      entities: {},
      data: {
        messageId: RainbowBlockedMessages.BLOCKED,
        message: 'The rainbow is beautiful, but it looks far too insubstantial to walk on.'
      },
      narrate: true
    }];
  },

  report(_context: ActionContext): ISemanticEvent[] {
    return [];
  }
};
