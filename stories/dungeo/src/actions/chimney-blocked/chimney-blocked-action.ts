/**
 * Chimney Blocked Action
 *
 * Shows the blocking message when player tries to climb the chimney in the Studio
 * without meeting the requirements (lamp + max 1 other item).
 *
 * From MDL source (dung.355 line 1796):
 * - "The chimney is too narrow for you and all of your baggage."
 *
 * From MDL source (act1.254 line 143):
 * - "Going up empty-handed is a bad idea." (note: original has typo "idead")
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { CHIMNEY_BLOCKED_ACTION_ID, ChimneyBlockedMessages, ChimneyBlockReason } from './types';

// Event ID counter
let eventCounter = 0;
function generateEventId(): string {
  return `chimney-blocked-${Date.now()}-${++eventCounter}`;
}

export const chimneyBlockedAction: Action = {
  id: CHIMNEY_BLOCKED_ACTION_ID,
  group: 'movement',

  validate(context: ActionContext): ValidationResult {
    // Always "fails" validation to show the blocking message
    const reason = context.command.parsed?.extras?.chimneyBlockReason as ChimneyBlockReason | undefined;
    const messageId = reason === 'empty'
      ? ChimneyBlockedMessages.EMPTY_HANDED
      : ChimneyBlockedMessages.TOO_MUCH_BAGGAGE;

    return {
      valid: false,
      error: messageId
    };
  },

  execute(_context: ActionContext): void {
    // Never called since validate always fails
  },

  blocked(context: ActionContext, _result: ValidationResult): ISemanticEvent[] {
    const reason = context.command.parsed?.extras?.chimneyBlockReason as ChimneyBlockReason | undefined;

    let messageId: string;
    let message: string;

    if (reason === 'empty') {
      messageId = ChimneyBlockedMessages.EMPTY_HANDED;
      message = 'Going up empty-handed is a bad idea.';
    } else {
      messageId = ChimneyBlockedMessages.TOO_MUCH_BAGGAGE;
      message = 'The chimney is too narrow for you and all of your baggage.';
    }

    return [{
      id: generateEventId(),
      type: 'game.message',
      timestamp: Date.now(),
      entities: {},
      data: {
        messageId,
        message
      },
      narrate: true
    }];
  },

  report(_context: ActionContext): ISemanticEvent[] {
    return [];
  }
};
