/**
 * Pray Action - Story-specific action for praying
 *
 * Used in the Basin Room to progress the ghost ritual puzzle (ADR-078).
 *
 * Basin state machine:
 * - 'normal': Default, prayer has generic effect
 * - 'disarmed': Incense is burning, prayer blesses the water
 * - 'blessed': Water is blessed, ready for frame piece drop
 *
 * Pattern: "pray", "pray at basin"
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IFEntity, IdentityTrait } from '@sharpee/world-model';
import { PRAY_ACTION_ID, PrayMessages } from './types';

/**
 * Check if the player is in the Basin Room
 */
function isInBasinRoom(context: ActionContext): boolean {
  const { world, player } = context;
  const playerLocation = world.getLocation(player.id);
  if (!playerLocation) return false;

  const room = world.getEntity(playerLocation);
  if (!room) return false;

  const identity = room.get(IdentityTrait);
  return identity?.name === 'Basin Room';
}

/**
 * Get the Basin Room entity
 */
function getBasinRoom(context: ActionContext): IFEntity | undefined {
  const { world, player } = context;
  const playerLocation = world.getLocation(player.id);
  if (!playerLocation) return undefined;

  const room = world.getEntity(playerLocation);
  if (!room) return undefined;

  const identity = room.get(IdentityTrait);
  if (identity?.name === 'Basin Room') {
    return room;
  }
  return undefined;
}

/**
 * Check if incense is burning in the room
 */
function isIncenseBurning(context: ActionContext): boolean {
  const { world, player } = context;
  const playerLocation = world.getLocation(player.id);
  if (!playerLocation) return false;

  // Check room contents for burning incense
  const contents = world.getContents(playerLocation);
  for (const item of contents) {
    if ((item as any).isIncense && (item as any).isBurning) {
      return true;
    }
  }

  // Also check player inventory (if holding burning incense)
  const inventory = world.getContents(player.id);
  for (const item of inventory) {
    if ((item as any).isIncense && (item as any).isBurning) {
      return true;
    }
  }

  return false;
}

/**
 * Pray Action Definition
 */
export const prayAction: Action = {
  id: PRAY_ACTION_ID,
  group: 'communication',

  validate(context: ActionContext): ValidationResult {
    // Prayer only has special effect in Basin Room
    // But we allow praying anywhere (with generic response)
    const inBasinRoom = isInBasinRoom(context);
    context.sharedData.inBasinRoom = inBasinRoom;

    if (inBasinRoom) {
      const basinRoom = getBasinRoom(context);
      context.sharedData.basinRoom = basinRoom;
      context.sharedData.basinState = (basinRoom as any)?.basinState || 'normal';
    }

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { sharedData } = context;

    if (!sharedData.inBasinRoom) {
      // Generic prayer outside Basin Room - no state change
      sharedData.resultMessage = PrayMessages.PRAY_GENERIC;
      return;
    }

    const basinRoom = sharedData.basinRoom as IFEntity;
    const currentState = sharedData.basinState as string;

    if (currentState === 'blessed') {
      // Already blessed
      sharedData.resultMessage = PrayMessages.PRAY_ALREADY_BLESSED;
      return;
    }

    // Check if incense is burning
    const incenseBurning = isIncenseBurning(context);

    if (currentState === 'normal' && incenseBurning) {
      // Incense burning disarms the trap, prayer can now work
      (basinRoom as any).basinState = 'disarmed';
      sharedData.resultMessage = PrayMessages.PRAY_DISARMED;
      sharedData.newState = 'disarmed';
      return;
    }

    if (currentState === 'disarmed') {
      // Second prayer blesses the water
      (basinRoom as any).basinState = 'blessed';
      sharedData.resultMessage = PrayMessages.PRAY_BLESSED;
      sharedData.newState = 'blessed';
      return;
    }

    // Normal state without incense - generic response
    sharedData.resultMessage = PrayMessages.PRAY_GENERIC;
  },

  blocked(_context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    // Prayer is never blocked (always valid)
    return [];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const { sharedData } = context;
    const events: ISemanticEvent[] = [];

    const messageId = sharedData.resultMessage || PrayMessages.PRAY_GENERIC;

    events.push(context.event('game.message', {
      messageId,
      inBasinRoom: sharedData.inBasinRoom,
      basinState: sharedData.newState || sharedData.basinState
    }));

    return events;
  }
};
