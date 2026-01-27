/**
 * Push Key Action (Tiny Room puzzle)
 *
 * Handles "PUSH KEY WITH SCREWDRIVER" for the key puzzle.
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { PUSH_KEY_ACTION_ID, PushKeyMessages } from './types';
import {
  findTinyRoomDoor,
  findScrewdriver,
  handlePushKeyWithScrewdriver
} from '../../handlers/tiny-room-handler';
import { TinyRoomDoorTrait } from '../../traits';

// Event ID counter
let eventCounter = 0;
function generateEventId(): string {
  return `push-key-${Date.now()}-${++eventCounter}`;
}

// Store result from execute for report
let lastResult: { success: boolean; messageId: string } | undefined;

export const pushKeyAction: Action = {
  id: PUSH_KEY_ACTION_ID,
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
        error: PushKeyMessages.NO_DOOR_HERE
      };
    }

    // Check if player has screwdriver
    const screwdriver = findScrewdriver(world, player.id);
    if (!screwdriver) {
      return {
        valid: false,
        error: PushKeyMessages.NO_SCREWDRIVER
      };
    }

    // Check if key is still in lock
    const doorTrait = door.get(TinyRoomDoorTrait);
    if (!doorTrait?.keyInLock) {
      return {
        valid: false,
        error: PushKeyMessages.KEY_ALREADY_PUSHED
      };
    }

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world } = context;
    const player = world.getPlayer();
    if (!player) return;

    const playerLocation = world.getLocation(player.id);
    if (!playerLocation) return;

    // Perform the action and store result
    lastResult = handlePushKeyWithScrewdriver(world, player.id, playerLocation);
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [{
      id: generateEventId(),
      type: 'game.message',
      timestamp: Date.now(),
      entities: {},
      data: {
        messageId: result.error || PushKeyMessages.NO_DOOR_HERE
      },
      narrate: true
    }];
  },

  report(_context: ActionContext): ISemanticEvent[] {
    const messageId = lastResult?.messageId || PushKeyMessages.KEY_PUSHED;
    lastResult = undefined; // Clear for next action

    return [{
      id: generateEventId(),
      type: 'game.message',
      timestamp: Date.now(),
      entities: {},
      data: { messageId },
      narrate: true
    }];
  }
};
