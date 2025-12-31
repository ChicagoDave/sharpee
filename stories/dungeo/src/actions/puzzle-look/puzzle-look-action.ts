/**
 * Puzzle Look Action
 *
 * Story-specific action for looking around inside the Royal Puzzle.
 * Shows the dynamic room description based on puzzle state.
 */

import { Action, ActionContext, ValidationResult, ActionMetadata } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait } from '@sharpee/world-model';
import {
  getPuzzleState,
  getPuzzleDescription
} from '../../regions/royal-puzzle';

export const PUZZLE_LOOK_ACTION_ID = 'dungeo.puzzle.look';

// Event ID counter
let eventCounter = 0;
function generateEventId(): string {
  return `puzzle-look-${Date.now()}-${++eventCounter}`;
}

// State keys for finding puzzle controller
const PUZZLE_CONTROLLER_KEY = 'dungeo.royal_puzzle.controllerId';

function findPuzzleController(world: any): any | undefined {
  const controllerId = world.getStateValue(PUZZLE_CONTROLLER_KEY);
  if (controllerId) {
    return world.getEntity(controllerId);
  }

  // Fallback: search for it
  const entities = world.getAllEntities();
  return entities.find((e: any) => {
    const identity = e.get(IdentityTrait);
    return identity?.name === 'Royal Puzzle Controller';
  });
}

export const puzzleLookAction: Action & { metadata: ActionMetadata } = {
  id: PUZZLE_LOOK_ACTION_ID,
  requiredMessages: [],

  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  },

  validate(context: ActionContext): ValidationResult {
    return { valid: true };
  },

  execute(context: ActionContext): void {
    // Nothing to mutate - just gathering info for report
  },

  report(context: ActionContext): ISemanticEvent[] {
    const controller = findPuzzleController(context.world);
    if (!controller) {
      return [{
        id: generateEventId(),
        type: 'if.event.room.description',
        timestamp: Date.now(),
        entities: {},
        data: {
          roomName: 'Room in a Puzzle',
          roomDescription: 'You are in a maze of sandstone walls.'
        },
        narrate: true
      }];
    }

    const state = getPuzzleState(controller);
    const description = getPuzzleDescription(state);

    return [{
      id: generateEventId(),
      type: 'action.success',
      timestamp: Date.now(),
      entities: {},
      data: {
        actionId: PUZZLE_LOOK_ACTION_ID,
        messageId: 'puzzle_look_description',
        message: `Room in a Puzzle\n${description}`
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
        actionId: PUZZLE_LOOK_ACTION_ID,
        messageId: 'puzzle_look_error'
      }
    }];
  }
};
