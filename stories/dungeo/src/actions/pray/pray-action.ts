/**
 * Pray Action - Story-specific action for praying
 *
 * Per Fortran source (sverbs.for V79, label 10000):
 * - At Altar (TEMP2): Teleport player to Forest Path 1 (FORE1)
 * - Elsewhere: Show generic joke message
 *
 * Pattern: "pray"
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait, RoomTrait } from '@sharpee/world-model';
import { PRAY_ACTION_ID, PrayMessages } from './types';

/**
 * Check if the player is at the Altar
 */
function isAtAltar(context: ActionContext): boolean {
  const identity = context.currentLocation.get(IdentityTrait);
  return identity?.name === 'Altar';
}

/**
 * Find Forest Path 1 (FORE1) - the teleport destination
 */
function findForestPath1(context: ActionContext): string | undefined {
  const forest = context.world.getAllEntities().find(e => {
    const identity = e.get(IdentityTrait);
    return identity?.name === 'Forest Path' &&
           identity?.aliases?.includes('forest path 1');
  });
  return forest?.id;
}

/**
 * Pray Action Definition
 */
export const prayAction: Action = {
  id: PRAY_ACTION_ID,
  group: 'communication',

  validate(context: ActionContext): ValidationResult {
    // Prayer is always valid
    const atAltar = isAtAltar(context);
    context.sharedData.atAltar = atAltar;

    if (atAltar) {
      // Find the forest destination
      const forestId = findForestPath1(context);
      if (!forestId) {
        // Forest not found - can't teleport, but prayer still valid
        context.sharedData.forestNotFound = true;
      } else {
        context.sharedData.forestId = forestId;
      }
    }

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world, player, sharedData } = context;

    if (!sharedData.atAltar) {
      // Generic prayer - no effect
      sharedData.resultMessage = PrayMessages.PRAY_GENERIC;
      return;
    }

    if (sharedData.forestNotFound) {
      // Edge case: Altar exists but Forest doesn't
      sharedData.resultMessage = PrayMessages.PRAY_GENERIC;
      return;
    }

    // Teleport player to Forest Path 1
    const forestId = sharedData.forestId as string;
    world.moveEntity(player.id, forestId);
    sharedData.teleported = true;
    sharedData.resultMessage = PrayMessages.PRAY_TELEPORT;
  },

  blocked(_context: ActionContext, _result: ValidationResult): ISemanticEvent[] {
    // Prayer is never blocked
    return [];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const { sharedData } = context;
    const events: ISemanticEvent[] = [];

    const messageId = sharedData.resultMessage || PrayMessages.PRAY_GENERIC;

    events.push(context.event('game.message', {
      messageId,
      teleported: sharedData.teleported || false
    }));

    // If teleported, also describe the new location
    if (sharedData.teleported && sharedData.forestId) {
      events.push(context.event('player.teleported', {
        actionId: PRAY_ACTION_ID,
        destination: sharedData.forestId,
        messageId: PrayMessages.PRAY_TELEPORT
      }));
    }

    return events;
  }
};
