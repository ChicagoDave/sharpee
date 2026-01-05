/**
 * Pull Mat Action (Tiny Room puzzle)
 *
 * Handles pulling the mat from under the door after key puzzle.
 * If key was pushed out and landed on mat, player gets both.
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { PULL_MAT_ACTION_ID, PullMatMessages } from './types';
import {
  findTinyRoomDoor,
  handlePullMat
} from '../../handlers/tiny-room-handler';

// Event ID counter
let eventCounter = 0;
function generateEventId(): string {
  return `pull-mat-${Date.now()}-${++eventCounter}`;
}

export const pullMatAction: Action = {
  id: PULL_MAT_ACTION_ID,
  group: 'manipulation',

  validate(context: ActionContext): ValidationResult {
    const { world } = context;
    const player = world.getPlayer();
    if (!player) {
      return { valid: false, error: 'error.no_player' };
    }

    const playerLocation = world.getLocation(player.id);
    if (!playerLocation) {
      return { valid: false, error: 'error.no_location' };
    }

    // Check for the tiny room door
    const door = findTinyRoomDoor(world, playerLocation);
    if (!door) {
      return {
        valid: false,
        error: PullMatMessages.NO_DOOR_HERE
      };
    }

    // Check if mat is actually under door
    if (!(door as any).matUnderDoor) {
      return {
        valid: false,
        error: PullMatMessages.MAT_NOT_UNDER_DOOR
      };
    }

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world, sharedData } = context;
    const player = world.getPlayer();
    if (!player) return;

    const playerLocation = world.getLocation(player.id);
    if (!playerLocation) return;

    // Perform the action
    const result = handlePullMat(world, player.id, playerLocation);

    // Store result for report phase
    sharedData.pullMatResult = result;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [{
      id: generateEventId(),
      type: 'game.message',
      timestamp: Date.now(),
      entities: {},
      data: {
        messageId: result.error || PullMatMessages.MAT_NOT_UNDER_DOOR
      },
      narrate: true
    }];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const result = context.sharedData.pullMatResult;
    if (result && result.events && result.events.length > 0) {
      return result.events;
    }

    // Fallback
    return [{
      id: generateEventId(),
      type: 'game.message',
      timestamp: Date.now(),
      entities: {},
      data: {
        messageId: PullMatMessages.MAT_PULLED
      },
      narrate: true
    }];
  }
};
