/**
 * Room Action
 *
 * Prints the verbose description of the current room without objects.
 * This is the room-only part of LOOK.
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, RoomTrait } from '@sharpee/world-model';
import { ROOM_ACTION_ID } from './types';

export const roomAction: Action = {
  id: ROOM_ACTION_ID,
  group: 'observation',

  validate(context: ActionContext): ValidationResult {
    return { valid: true };
  },

  execute(context: ActionContext): void {
    // No mutations needed
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: this.id,
      messageId: result.error,
      reason: result.error,
      params: result.params || {}
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const { world, player } = context;

    const room = world.getContainingRoom(player.id);
    if (!room) {
      return events;
    }

    const roomTrait = room.get<RoomTrait>(TraitType.ROOM);
    const description = room.description || 'You see nothing special.';

    // Emit room description event (same as looking action)
    events.push(context.event('if.event.room.description', {
      roomId: room.id,
      roomName: room.name,
      description: description,
      isVisited: roomTrait?.visited || false,
    }));

    return events;
  }
};
