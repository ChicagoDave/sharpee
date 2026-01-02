/**
 * PUSH DIAL BUTTON Action - Push the button on the Parapet sundial
 *
 * Pattern: "push button", "press button" (when at Parapet)
 *
 * Activates the dial setting, rotating the corresponding cell into
 * the accessible position. If cell 4 is selected, the bronze door
 * to the Treasury becomes visible.
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait, RoomTrait, Direction } from '@sharpee/world-model';
import { PUSH_DIAL_BUTTON_ACTION_ID, PushDialButtonMessages } from './types';

/**
 * Check if the player is at the Parapet
 */
function isAtParapet(context: ActionContext): boolean {
  const { world, player } = context;
  const playerLocation = world.getLocation(player.id);
  if (!playerLocation) return false;

  const room = world.getEntity(playerLocation);
  if (!room) return false;

  const identity = room.get(IdentityTrait);
  return identity?.name === 'Parapet';
}

/**
 * Find Prison Cell room
 */
function findPrisonCell(context: ActionContext): string | null {
  const { world } = context;
  for (const entity of world.getAllEntities()) {
    const identity = entity.get(IdentityTrait);
    if (identity?.name === 'Prison Cell') {
      return entity.id;
    }
  }
  return null;
}

/**
 * Find Treasury room
 */
function findTreasury(context: ActionContext): string | null {
  const { world } = context;
  for (const entity of world.getAllEntities()) {
    const identity = entity.get(IdentityTrait);
    if (identity?.name === 'Treasury of Zork') {
      return entity.id;
    }
  }
  return null;
}

/**
 * Find Parapet room
 */
function findParapet(context: ActionContext): string | null {
  const { world } = context;
  for (const entity of world.getAllEntities()) {
    const identity = entity.get(IdentityTrait);
    if (identity?.name === 'Parapet') {
      return entity.id;
    }
  }
  return null;
}

/**
 * PUSH DIAL BUTTON Action Definition
 */
export const pushDialButtonAction: Action = {
  id: PUSH_DIAL_BUTTON_ACTION_ID,
  group: 'manipulation',

  validate(context: ActionContext): ValidationResult {
    const atParapet = isAtParapet(context);
    context.sharedData.atParapet = atParapet;

    if (!atParapet) {
      return {
        valid: false,
        error: PushDialButtonMessages.NOT_AT_PARAPET
      };
    }

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world, sharedData } = context;

    // Get current dial setting
    const dialSetting = (world.getStateValue('parapet.dialSetting') as number) ?? 1;
    const previousCell = (world.getStateValue('parapet.activatedCell') as number) ?? 0;
    sharedData.dialSetting = dialSetting;
    sharedData.previousCell = previousCell;

    // Activate the cell
    world.setStateValue('parapet.activatedCell', dialSetting);
    world.setStateValue('prisonCell.currentCell', dialSetting);

    // Find rooms for connections
    const prisonCellId = findPrisonCell(context);
    const parapetId = findParapet(context);
    sharedData.prisonCellId = prisonCellId;

    // Update bronze door visibility
    if (dialSetting === 4) {
      world.setStateValue('prisonCell.bronzeDoorVisible', true);
      sharedData.bronzeDoorNowVisible = true;
    } else if (previousCell === 4) {
      world.setStateValue('prisonCell.bronzeDoorVisible', false);
      sharedData.bronzeDoorNowVisible = false;
    }

    // Connect Parapet D -> Prison Cell (cell is below the parapet)
    if (prisonCellId && parapetId) {
      const parapet = world.getEntity(parapetId);
      if (parapet) {
        const roomTrait = parapet.get(RoomTrait);
        if (roomTrait) {
          roomTrait.exits[Direction.DOWN] = { destination: prisonCellId };
        }
      }

      // Prison Cell U -> Parapet
      const prisonCell = world.getEntity(prisonCellId);
      if (prisonCell) {
        const roomTrait = prisonCell.get(RoomTrait);
        if (roomTrait) {
          roomTrait.exits[Direction.UP] = { destination: parapetId };
        }
      }
    }
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [
      context.event('action.blocked', {
        messageId: result.error || PushDialButtonMessages.NOT_AT_PARAPET
      })
    ];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const { sharedData } = context;
    const dialSetting = sharedData.dialSetting as number;

    const events: ISemanticEvent[] = [];

    // Button push message
    events.push(context.event('game.message', {
      messageId: PushDialButtonMessages.PUSH_BUTTON
    }));

    // Machinery sounds
    events.push(context.event('game.message', {
      messageId: PushDialButtonMessages.MACHINERY_SOUNDS,
      params: { dialSetting }
    }));

    return events;
  }
};
