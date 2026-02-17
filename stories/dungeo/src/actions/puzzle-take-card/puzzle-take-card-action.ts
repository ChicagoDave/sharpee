/**
 * Puzzle Take Card Action
 *
 * Story-specific action for taking the gold card from inside the Royal Puzzle.
 * This action is invoked by the puzzle command transformer when player
 * tries to take the card while inside the puzzle grid and is at the card position.
 */

import { Action, ActionContext, ValidationResult, ActionMetadata } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import {
  handleTakeCard,
  PuzzleHandlerMessages
} from '../../handlers/royal-puzzle/puzzle-handler';

export const PUZZLE_TAKE_CARD_ACTION_ID = 'dungeo.puzzle.take_card';

// Event ID counter
let eventCounter = 0;
function generateEventId(): string {
  return `puzzle-take-card-${Date.now()}-${++eventCounter}`;
}

export const puzzleTakeCardAction: Action & { metadata: ActionMetadata } = {
  id: PUZZLE_TAKE_CARD_ACTION_ID,
  requiredMessages: [],

  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  },

  validate(context: ActionContext): ValidationResult {
    // The transformer already verified we're in puzzle and at card position
    // Just pass through
    return { valid: true };
  },

  execute(context: ActionContext): void {
    // Handle the take card - this mutates puzzle state and moves card to inventory
    const events = handleTakeCard(context.world);

    // Store events for report phase
    (context.sharedData as any).takeCardEvents = events;
  },

  report(context: ActionContext): ISemanticEvent[] {
    const events = (context.sharedData as any).takeCardEvents as ISemanticEvent[] | null;

    if (events && events.length > 0) {
      return events;
    }

    // Fallback - couldn't take the card (not at card position)
    return [{
      id: generateEventId(),
      type: 'game.message',
      timestamp: Date.now(),
      entities: {},
      data: {
        messageId: PuzzleHandlerMessages.CANT_TAKE_CARD
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
        actionId: PUZZLE_TAKE_CARD_ACTION_ID,
        messageId: validation.error || PuzzleHandlerMessages.CANT_TAKE_CARD,
        params: validation.params || {}
      }
    }];
  }
};
