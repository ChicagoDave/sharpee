/**
 * Put Under Action (Tiny Room puzzle)
 *
 * Handles "PUT MAT UNDER DOOR" for the key puzzle.
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { PUT_UNDER_ACTION_ID, PutUnderMessages } from './types';
import {
  findTinyRoomDoor,
  findMat,
  handlePutMatUnderDoor
} from '../../handlers/tiny-room-handler';

// Event ID counter
let eventCounter = 0;
function generateEventId(): string {
  return `put-under-${Date.now()}-${++eventCounter}`;
}

export const putUnderAction: Action = {
  id: PUT_UNDER_ACTION_ID,
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
        error: PutUnderMessages.NO_DOOR_HERE
      };
    }

    // Check if mat already placed (before checking inventory!)
    if ((door as any).matUnderDoor) {
      return {
        valid: false,
        error: PutUnderMessages.MAT_ALREADY_PLACED
      };
    }

    // Check if player has a mat
    const mat = findMat(world, player.id);
    if (!mat) {
      return {
        valid: false,
        error: PutUnderMessages.MAT_NOT_HELD
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

    // Perform the action
    handlePutMatUnderDoor(world, player.id, playerLocation);
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [{
      id: generateEventId(),
      type: 'game.message',
      timestamp: Date.now(),
      entities: {},
      data: {
        messageId: result.error || PutUnderMessages.GENERIC_FAIL
      },
      narrate: true
    }];
  },

  report(_context: ActionContext): ISemanticEvent[] {
    return [{
      id: generateEventId(),
      type: 'game.message',
      timestamp: Date.now(),
      entities: {},
      data: {
        messageId: PutUnderMessages.MAT_PLACED
      },
      narrate: true
    }];
  }
};
