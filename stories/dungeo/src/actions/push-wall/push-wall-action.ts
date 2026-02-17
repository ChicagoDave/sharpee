/**
 * Push Wall Action
 *
 * Handles pushing sandstone walls in the Royal Puzzle.
 * Only works inside the Room in a Puzzle.
 *
 * Syntax: "push :direction wall" where :direction is a direction slot
 * Examples: "push east wall", "push n wall", "push the west wall"
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait, DirectionType, Direction } from '@sharpee/world-model';
import { PUSH_WALL_ACTION_ID, PushWallMessages, PushDirection } from './types';
import {
  getPuzzleState,
  canPush,
  executePush,
  isLadderVisible,
  isAtCardPosition,
  getPuzzleDescription,
  RoyalPuzzleState
} from '../../regions/royal-puzzle';

/**
 * Map Direction constants to PushDirection strings
 */
const DIRECTION_MAP: Partial<Record<DirectionType, PushDirection>> = {
  [Direction.NORTH]: 'north',
  [Direction.SOUTH]: 'south',
  [Direction.EAST]: 'east',
  [Direction.WEST]: 'west',
};

/**
 * Get push direction from parsed command
 * The parser provides the direction via extras.direction as a Direction constant
 */
function getDirection(context: ActionContext): PushDirection | undefined {
  // Get direction from parsed extras (same pattern as going action)
  const directionConstant = context.command.parsed?.extras?.direction as DirectionType | undefined;

  if (directionConstant) {
    return DIRECTION_MAP[directionConstant];
  }

  return undefined;
}

/**
 * Check if player is in the Room in a Puzzle
 */
function isInPuzzleRoom(context: ActionContext): boolean {
  const identity = context.currentLocation.get(IdentityTrait);
  if (!identity) return false;
  return identity.name === 'Room in a Puzzle';
}

/**
 * Find the puzzle controller entity
 */
function findPuzzleController(context: ActionContext): any | undefined {
  const entities = context.world.getAllEntities();
  return entities.find(e => {
    const identity = e.get(IdentityTrait);
    return identity?.name === 'Royal Puzzle Controller';
  });
}

export const pushWallAction: Action = {
  id: PUSH_WALL_ACTION_ID,
  group: 'puzzle',

  validate(context: ActionContext): ValidationResult {
    // Grammar pattern already ensures we have a direction slot
    // Get the direction from parsed command
    const direction = getDirection(context);
    if (!direction) {
      // No valid direction in the command - shouldn't happen with proper grammar
      return { valid: false, error: PushWallMessages.NO_DIRECTION };
    }

    // Must be in Room in a Puzzle
    if (!isInPuzzleRoom(context)) {
      return { valid: false, error: PushWallMessages.NOT_IN_PUZZLE };
    }

    // Must have a puzzle controller
    const controller = findPuzzleController(context);
    if (!controller) {
      return { valid: false, error: PushWallMessages.NOT_IN_PUZZLE };
    }

    // Check if push is valid
    const state = getPuzzleState(controller);
    const result = canPush(state, direction);

    if (result !== 'success') {
      const errorMap: Record<string, string> = {
        'no-wall': PushWallMessages.NO_WALL,
        'immovable': PushWallMessages.IMMOVABLE,
        'no-room': PushWallMessages.NO_ROOM,
        'boundary': PushWallMessages.BOUNDARY
      };
      return { valid: false, error: errorMap[result] || PushWallMessages.NO_ROOM };
    }

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const controller = findPuzzleController(context)!;
    const state = getPuzzleState(controller);
    const direction = getDirection(context)!;

    // Store info for reporting
    const isFirstPush = state.pushCount === 0;
    context.sharedData.isFirstPush = isFirstPush;
    context.sharedData.direction = direction;
    context.sharedData.oldPosition = state.playerPos;

    // Execute the push
    executePush(state, direction);

    // Store new state info
    context.sharedData.newPosition = state.playerPos;
    context.sharedData.ladderVisible = isLadderVisible(state);
    context.sharedData.cardVisible = isAtCardPosition(state);
    context.sharedData.newDescription = getPuzzleDescription(state);
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: PUSH_WALL_ACTION_ID,
      messageId: result.error,
      reason: result.error
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];

    // Success message
    const messageId = context.sharedData.isFirstPush
      ? PushWallMessages.SUCCESS_FIRST
      : PushWallMessages.SUCCESS;

    events.push(context.event('action.success', {
      actionId: PUSH_WALL_ACTION_ID,
      messageId,
      direction: context.sharedData.direction
    }));

    // Room description after push
    events.push(context.event('game.message', {
      messageId: 'dungeo.puzzle.room_description',
      params: { text: context.sharedData.newDescription }
    }));

    return events;
  }
};
