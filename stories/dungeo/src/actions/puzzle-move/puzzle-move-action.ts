/**
 * Puzzle Move Action
 *
 * Story-specific action for handling movement inside the Royal Puzzle.
 * This action is invoked by the puzzle command transformer when player
 * tries to move while inside the puzzle grid.
 */

import { Action, ActionContext, ValidationResult, ActionMetadata } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import {
  handlePuzzleMovement,
  PuzzleHandlerMessages
} from '../../handlers/royal-puzzle/puzzle-handler';

// Event ID counter
let eventCounter = 0;
function generateEventId(): string {
  return `puzzle-move-${Date.now()}-${++eventCounter}`;
}

export const puzzleMoveAction: Action & { metadata: ActionMetadata } = {
  id: 'dungeo.puzzle.move',
  requiredMessages: [],

  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  },

  validate(context: ActionContext): ValidationResult {
    // Get direction from extras
    const direction = context.command.parsed.extras?.direction as string;

    if (!direction) {
      return {
        valid: false,
        error: 'action.going.no_direction'
      };
    }

    // Store direction for execute phase
    (context.sharedData as any).direction = direction;

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const direction = (context.sharedData as any).direction as string;

    // Handle the puzzle movement - this mutates puzzle state
    const events = handlePuzzleMovement(context.world, direction);

    // Store events for report phase
    (context.sharedData as any).puzzleEvents = events;
  },

  report(context: ActionContext): ISemanticEvent[] {
    const events = (context.sharedData as any).puzzleEvents as ISemanticEvent[] | null;

    if (events && events.length > 0) {
      return events;
    }

    // Fallback - shouldn't happen
    return [{
      id: generateEventId(),
      type: 'game.message',
      timestamp: Date.now(),
      entities: {},
      data: {
        messageId: PuzzleHandlerMessages.MOVE_BLOCKED,
        direction: (context.sharedData as any).direction || 'unknown'
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
        actionId: 'dungeo.puzzle.move',
        messageId: validation.error || 'action.going.no_direction',
        params: validation.params || {}
      }
    }];
  }
};
