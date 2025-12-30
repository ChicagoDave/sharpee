/**
 * Push Wall Action
 *
 * Handles pushing sandstone walls in the Royal Puzzle.
 * Only works inside the Room in a Puzzle.
 *
 * Syntax: "push [direction] wall" or "push wall [direction]"
 * Examples: "push east wall", "push the eastern wall", "push wall to the north"
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait } from '@sharpee/world-model';
import { PUSH_WALL_ACTION_ID, PushWallMessages, PushDirection } from './types';
import {
  getPuzzleState,
  canPush,
  executePush,
  isLadderVisible,
  isAdjacentToCard,
  getPuzzleDescription,
  RoyalPuzzleState
} from '../../regions/royal-puzzle';

/**
 * Extract push direction from command input
 */
function extractDirection(context: ActionContext): PushDirection | undefined {
  const rawInput = context.command.parsed?.rawInput?.toLowerCase() || '';

  // Try to find direction in various patterns
  // "push east wall", "push eastern wall", "push the east wall"
  // "push wall east", "push wall to the east"
  const directionPatterns = [
    /push\s+(?:the\s+)?(?:north(?:ern)?)\s+wall/,
    /push\s+(?:the\s+)?(?:south(?:ern)?)\s+wall/,
    /push\s+(?:the\s+)?(?:east(?:ern)?)\s+wall/,
    /push\s+(?:the\s+)?(?:west(?:ern)?)\s+wall/,
    /push\s+wall\s+(?:to\s+(?:the\s+)?)?(?:north)/,
    /push\s+wall\s+(?:to\s+(?:the\s+)?)?(?:south)/,
    /push\s+wall\s+(?:to\s+(?:the\s+)?)?(?:east)/,
    /push\s+wall\s+(?:to\s+(?:the\s+)?)?(?:west)/,
  ];

  // Check for north
  if (/push\s+(?:the\s+)?(?:north(?:ern)?)\s+wall|push\s+wall\s+(?:to\s+(?:the\s+)?)?north/.test(rawInput)) {
    return 'north';
  }
  // Check for south
  if (/push\s+(?:the\s+)?(?:south(?:ern)?)\s+wall|push\s+wall\s+(?:to\s+(?:the\s+)?)?south/.test(rawInput)) {
    return 'south';
  }
  // Check for east
  if (/push\s+(?:the\s+)?(?:east(?:ern)?)\s+wall|push\s+wall\s+(?:to\s+(?:the\s+)?)?east/.test(rawInput)) {
    return 'east';
  }
  // Check for west
  if (/push\s+(?:the\s+)?(?:west(?:ern)?)\s+wall|push\s+wall\s+(?:to\s+(?:the\s+)?)?west/.test(rawInput)) {
    return 'west';
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

/**
 * Check if this command looks like a push wall command
 */
function isPushWallCommand(context: ActionContext): boolean {
  const rawInput = context.command.parsed?.rawInput?.toLowerCase() || '';
  return rawInput.includes('push') && rawInput.includes('wall');
}

export const pushWallAction: Action = {
  id: PUSH_WALL_ACTION_ID,
  group: 'puzzle',

  validate(context: ActionContext): ValidationResult {
    // First check if this looks like a push wall command
    if (!isPushWallCommand(context)) {
      // Let the regular push action handle it
      return { valid: false, error: 'not_push_wall' };
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

    // Must specify a direction
    const direction = extractDirection(context);
    if (!direction) {
      return { valid: false, error: PushWallMessages.NO_DIRECTION };
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
    const direction = extractDirection(context)!;

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
    context.sharedData.cardVisible = isAdjacentToCard(state);
    context.sharedData.newDescription = getPuzzleDescription(state);
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    // Don't emit events for non-push-wall commands
    if (result.error === 'not_push_wall') {
      return [];
    }

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
      text: context.sharedData.newDescription
    }));

    return events;
  }
};
