/**
 * Pray Action - Story-specific action for praying
 *
 * Per Fortran source (sverbs.for V79, label 10000):
 * - At Altar (TEMP2): Teleport player to Forest Path 1 (FORE1)
 * - In Basin Room: Bless the water (ADR-078 ghost ritual)
 * - Elsewhere: Show generic joke message
 *
 * Pattern: "pray"
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait, RoomTrait } from '@sharpee/world-model';
import { PRAY_ACTION_ID, PrayMessages } from './types';
import { BasinRoomTrait } from '../../traits/basin-room-trait';

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
 * Check if the player is in the Basin Room and get its trait
 */
function getBasinRoomTrait(context: ActionContext): BasinRoomTrait | null {
  const basinTrait = context.currentLocation.get(BasinRoomTrait);
  return basinTrait || null;
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
        context.sharedData.forestNotFound = true;
      } else {
        context.sharedData.forestId = forestId;
      }
      return { valid: true };
    }

    // Check for Basin Room
    const basinTrait = getBasinRoomTrait(context);
    if (basinTrait) {
      context.sharedData.inBasinRoom = true;
      context.sharedData.basinState = basinTrait.basinState;
    }

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world, player, sharedData } = context;

    // Altar teleport
    if (sharedData.atAltar) {
      if (sharedData.forestNotFound) {
        sharedData.resultMessage = PrayMessages.PRAY_GENERIC;
        return;
      }
      const forestId = sharedData.forestId as string;
      world.moveEntity(player.id, forestId);
      sharedData.teleported = true;
      sharedData.resultMessage = PrayMessages.PRAY_TELEPORT;
      return;
    }

    // Basin Room prayer
    if (sharedData.inBasinRoom) {
      const basinState = sharedData.basinState as string;

      if (basinState === 'normal') {
        // Basin trap is armed — death!
        sharedData.playerDied = true;
        sharedData.resultMessage = PrayMessages.PRAY_BASIN_DEATH;
        return;
      }

      if (basinState === 'disarmed') {
        // Incense is burning — bless the water
        const basinTrait = getBasinRoomTrait(context);
        if (basinTrait) {
          basinTrait.basinState = 'blessed';
        }
        sharedData.resultMessage = PrayMessages.PRAY_BASIN_BLESSED;
        return;
      }

      if (basinState === 'blessed') {
        // Already blessed
        sharedData.resultMessage = PrayMessages.PRAY_BASIN_ALREADY_BLESSED;
        return;
      }
    }

    // Generic prayer — no effect
    sharedData.resultMessage = PrayMessages.PRAY_GENERIC;
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
      teleported: sharedData.teleported || false,
      playerDied: sharedData.playerDied || false
    }));

    // If teleported, also describe the new location
    if (sharedData.teleported && sharedData.forestId) {
      events.push(context.event('player.teleported', {
        actionId: PRAY_ACTION_ID,
        destination: sharedData.forestId,
        messageId: PrayMessages.PRAY_TELEPORT
      }));
    }

    // If player died from basin trap
    if (sharedData.playerDied) {
      events.push(context.event('player.died', {
        actionId: PRAY_ACTION_ID,
        cause: 'basin_trap',
        messageId: PrayMessages.PRAY_BASIN_DEATH
      }));
    }

    return events;
  }
};
