/**
 * Puzzle Take Card Blocked Action
 *
 * Story-specific action for when player tries to take the gold card
 * but is not adjacent to it in the puzzle grid.
 */

import { Action, ActionContext, ValidationResult, ActionMetadata } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';

export const PUZZLE_TAKE_CARD_BLOCKED_ACTION_ID = 'dungeo.puzzle.take_card_blocked';

export const PuzzleTakeCardBlockedMessages = {
  CANT_REACH: 'dungeo.puzzle.cant_reach_card'
} as const;

// Event ID counter
let eventCounter = 0;
function generateEventId(): string {
  return `puzzle-take-card-blocked-${Date.now()}-${++eventCounter}`;
}

export const puzzleTakeCardBlockedAction: Action & { metadata: ActionMetadata } = {
  id: PUZZLE_TAKE_CARD_BLOCKED_ACTION_ID,
  requiredMessages: [PuzzleTakeCardBlockedMessages.CANT_REACH],

  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  },

  validate(context: ActionContext): ValidationResult {
    // Always valid - the transformer only sends here when we're not adjacent
    return { valid: true };
  },

  execute(context: ActionContext): void {
    // Nothing to execute - just report the message
  },

  report(context: ActionContext): ISemanticEvent[] {
    return [{
      id: generateEventId(),
      type: 'action.success',
      timestamp: Date.now(),
      entities: {},
      data: {
        actionId: PUZZLE_TAKE_CARD_BLOCKED_ACTION_ID,
        messageId: PuzzleTakeCardBlockedMessages.CANT_REACH,
        message: "You can see the gold card set in a depression in one of the sandstone walls, but you can't reach it from here."
      },
      narrate: true
    }];
  },

  blocked(context: ActionContext, validation: ValidationResult): ISemanticEvent[] {
    return [{
      id: generateEventId(),
      type: 'action.error',
      timestamp: Date.now(),
      entities: {},
      data: {
        actionId: PUZZLE_TAKE_CARD_BLOCKED_ACTION_ID,
        messageId: PuzzleTakeCardBlockedMessages.CANT_REACH
      }
    }];
  }
};
