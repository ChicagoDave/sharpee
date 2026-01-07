/**
 * Turn Bolt Action - Opens/closes Flood Control Dam #3
 *
 * When the player turns the bolt with a wrench:
 * - If gate not enabled (yellow button not pressed), bolt won't turn
 * - If player doesn't have wrench, can't turn bolt
 * - Otherwise, starts dam draining sequence (via dam-fuse)
 *
 * Per FORTRAN source:
 * - GATEF must be TRUE (yellow button pressed) for bolt to turn
 * - Wrench required to turn the bolt
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { WorldModel, IdentityTrait, IFEntity } from '@sharpee/world-model';
import { ISchedulerService } from '@sharpee/engine';
import { TURN_BOLT_ACTION_ID, TurnBoltMessages } from './types';
import {
  isYellowButtonPressed,
  isDamDrained,
  isDamDraining,
  startDamDraining
} from '../../scheduler/dam-fuse';

// Scheduler reference for starting draining sequence
let schedulerRef: ISchedulerService | null = null;
let reservoirIdRef: string = '';

/**
 * Set the scheduler reference for starting draining sequence
 */
export function setTurnBoltScheduler(scheduler: ISchedulerService, reservoirId: string): void {
  schedulerRef = scheduler;
  reservoirIdRef = reservoirId;
}

/**
 * Check if entity is the bolt
 */
function isBolt(entity: IFEntity): boolean {
  const identity = entity.get(IdentityTrait);
  if (!identity) return false;

  const name = identity.name?.toLowerCase() || '';
  return name === 'bolt' || name.includes('bolt');
}

/**
 * Check if entity is a wrench
 */
function isWrench(entity: IFEntity): boolean {
  const identity = entity.get(IdentityTrait);
  if (!identity) return false;

  const name = identity.name?.toLowerCase() || '';
  const aliases = identity.aliases || [];

  return name.includes('wrench') || aliases.some((a: string) => a.toLowerCase().includes('wrench'));
}

/**
 * Find bolt in current room
 */
function findBoltInRoom(context: ActionContext): IFEntity | undefined {
  const { world, player } = context;
  const playerLocation = world.getLocation(player.id);
  if (!playerLocation) return undefined;

  const roomContents = world.getContents(playerLocation);
  return roomContents.find(e => isBolt(e));
}

/**
 * Check if player has wrench
 */
function playerHasWrench(context: ActionContext): boolean {
  const { world, player } = context;
  const inventory = world.getContents(player.id);
  return inventory.some(e => isWrench(e));
}

/**
 * Turn Bolt Action Definition
 */
export const turnBoltAction: Action = {
  id: TURN_BOLT_ACTION_ID,
  group: 'manipulation',

  validate(context: ActionContext): ValidationResult {
    // Find bolt in current room
    const bolt = findBoltInRoom(context);

    if (!bolt) {
      return {
        valid: false,
        error: TurnBoltMessages.NO_BOLT
      };
    }

    // Check if player has wrench
    if (!playerHasWrench(context)) {
      return {
        valid: false,
        error: TurnBoltMessages.NO_WRENCH
      };
    }

    // Check if gate is enabled (yellow button was pressed)
    if (!isYellowButtonPressed(context.world as WorldModel)) {
      return {
        valid: false,
        error: TurnBoltMessages.GATE_LOCKED
      };
    }

    // Check if dam is already drained or draining
    const alreadyDrained = isDamDrained(context.world as WorldModel);
    const currentlyDraining = isDamDraining(context.world as WorldModel);

    // Store for execute phase
    context.sharedData.bolt = bolt;
    context.sharedData.alreadyDrained = alreadyDrained;
    context.sharedData.currentlyDraining = currentlyDraining;

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world, sharedData } = context;
    const alreadyDrained = sharedData.alreadyDrained as boolean;
    const currentlyDraining = sharedData.currentlyDraining as boolean;

    // If already drained or draining, bolt turns but nothing happens
    if (alreadyDrained || currentlyDraining) {
      sharedData.startedDraining = false;
      return;
    }

    // Start the draining sequence
    if (schedulerRef && reservoirIdRef) {
      const events = startDamDraining(schedulerRef, world as WorldModel, reservoirIdRef);
      sharedData.drainingEvents = events;
      sharedData.startedDraining = true;
    } else {
      // No scheduler configured - just report success without draining
      sharedData.startedDraining = true;
    }
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: TURN_BOLT_ACTION_ID,
      messageId: result.error || TurnBoltMessages.NO_BOLT,
      reason: result.error
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const { sharedData } = context;
    const alreadyDrained = sharedData.alreadyDrained as boolean;
    const currentlyDraining = sharedData.currentlyDraining as boolean;
    const startedDraining = sharedData.startedDraining as boolean;

    // Choose appropriate message
    let messageId: string;
    if (alreadyDrained) {
      messageId = TurnBoltMessages.DAM_ALREADY_OPEN;
    } else if (currentlyDraining) {
      messageId = TurnBoltMessages.DAM_OPENED; // Bolt turns but draining already in progress
    } else if (startedDraining) {
      messageId = TurnBoltMessages.DAM_OPENED;
    } else {
      messageId = TurnBoltMessages.DAM_OPENED;
    }

    return [context.event('game.message', {
      messageId
    })];
  }
};
