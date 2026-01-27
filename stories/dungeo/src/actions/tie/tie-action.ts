/**
 * Tie Action - Handle rope/wire tying scenarios
 *
 * Scenarios:
 * 1. Tie braided rope to hooks for balloon docking (volcano)
 * 2. Tie rope to railing in Dome Room to enable descent to Torch Room
 *
 * FORTRAN: Sets BTIEF to hook ID, disables balloon daemon (CFLAG(CEVBAL)=.FALSE.)
 *
 * Usage:
 * - TIE ROPE TO HOOK (balloon)
 * - TIE ROPE TO RAILING (Dome Room)
 * - TIE ROPE (context-sensitive)
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait, IFEntity, RoomTrait, Direction } from '@sharpee/world-model';
import { TIE_ACTION_ID, TieMessages } from './types';
import { BalloonStateTrait, isLedgePosition } from '../../traits';

/**
 * Check if entity is the braided wire (FORTRAN calls it BROPE but game text says "wire")
 */
function isBraidedWire(entity: IFEntity): boolean {
  const identity = entity.get(IdentityTrait);
  if (!identity) return false;

  const name = identity.name?.toLowerCase() || '';
  const aliases = (identity.aliases || []).map((a: string) => a.toLowerCase());

  return name.includes('wire') || name.includes('braided') ||
    aliases.some(a => a.includes('wire') || a.includes('braided'));
}

/**
 * Check if entity is a hook
 */
function isHook(entity: IFEntity): boolean {
  const identity = entity.get(IdentityTrait);
  if (!identity) return false;

  const name = identity.name?.toLowerCase() || '';
  const aliases = (identity.aliases || []).map((a: string) => a.toLowerCase());

  return name.includes('hook') ||
    aliases.some(a => a.includes('hook'));
}

/**
 * Check if entity is the balloon
 */
function isBalloon(entity: IFEntity): boolean {
  const identity = entity.get(IdentityTrait);
  if (!identity) return false;

  const name = identity.name?.toLowerCase() || '';
  const aliases = (identity.aliases || []).map((a: string) => a.toLowerCase());

  return name.includes('balloon') || name.includes('basket') ||
    aliases.some(a => a.includes('balloon') || a.includes('basket'));
}

/**
 * Check if entity is a rope (for Dome Room puzzle)
 */
function isRope(entity: IFEntity): boolean {
  const identity = entity.get(IdentityTrait);
  if (!identity) return false;

  const name = identity.name?.toLowerCase() || '';
  const aliases = (identity.aliases || []).map((a: string) => a.toLowerCase());

  return name.includes('rope') || name.includes('coil') ||
    aliases.some(a => a.includes('rope') || a.includes('coil'));
}

/**
 * Check if room has a railing (Dome Room)
 */
function hasRailing(room: IFEntity): boolean {
  return (room as any).hasRailing === true;
}

/**
 * Check if rope is already attached to railing
 */
function isRopeAttached(room: IFEntity): boolean {
  return (room as any).ropeAttached === true;
}

/**
 * Try to validate balloon tying scenario
 */
function validateBalloonTie(context: ActionContext): ValidationResult | null {
  const { world, player } = context;

  const playerLocation = world.getLocation(player.id);
  if (!playerLocation) return null;

  const locationEntity = world.getEntity(playerLocation);
  if (!locationEntity || !isBalloon(locationEntity)) return null;

  const balloon = locationEntity;
  const balloonState = balloon.get(BalloonStateTrait);

  // Check if balloon is at a ledge position
  if (!balloonState || !isLedgePosition(balloonState.position)) {
    return { valid: false, error: TieMessages.NOT_AT_LEDGE };
  }

  // Check if already tied
  if (balloonState.tetheredTo) {
    return { valid: false, error: TieMessages.ALREADY_TIED };
  }

  // Find the wire and hook in the balloon
  const balloonContents = world.getContents(balloon.id);
  const wire = balloonContents.find(e => isBraidedWire(e));
  const hook = balloonContents.find(e => isHook(e));

  if (!wire) {
    return { valid: false, error: TieMessages.NO_ROPE };
  }

  if (!hook) {
    return { valid: false, error: TieMessages.NO_HOOK };
  }

  // Store for execute phase
  context.sharedData.tieScenario = 'balloon';
  context.sharedData.tieBalloon = balloon;
  context.sharedData.tieWire = wire;
  context.sharedData.tieHook = hook;

  return { valid: true };
}

/**
 * Try to validate Dome Room railing tying scenario
 */
function validateRailingTie(context: ActionContext): ValidationResult | null {
  const { world, player } = context;

  const playerLocation = world.getLocation(player.id);
  if (!playerLocation) return null;

  const room = world.getEntity(playerLocation);
  if (!room) return null;

  // Check if room has a railing
  if (!hasRailing(room)) {
    return null; // Not this scenario
  }

  // Check if rope is already attached
  if (isRopeAttached(room)) {
    return { valid: false, error: TieMessages.ROPE_ALREADY_TIED };
  }

  // Check if player has rope
  const inventory = world.getContents(player.id);
  const rope = inventory.find(e => isRope(e));

  if (!rope) {
    return { valid: false, error: TieMessages.NEED_ROPE };
  }

  // Store for execute phase
  context.sharedData.tieScenario = 'railing';
  context.sharedData.tieRoom = room;
  context.sharedData.tieRope = rope;

  return { valid: true };
}

/**
 * Tie Action
 */
export const tieAction: Action = {
  id: TIE_ACTION_ID,
  group: 'manipulation',

  validate(context: ActionContext): ValidationResult {
    // Try balloon scenario first
    const balloonResult = validateBalloonTie(context);
    if (balloonResult !== null) {
      return balloonResult;
    }

    // Try railing scenario
    const railingResult = validateRailingTie(context);
    if (railingResult !== null) {
      return railingResult;
    }

    // Neither scenario applies
    return { valid: false, error: TieMessages.NO_RAILING };
  },

  execute(context: ActionContext): void {
    const scenario = context.sharedData.tieScenario;

    if (scenario === 'balloon') {
      // Balloon tying
      const balloon = context.sharedData.tieBalloon as IFEntity;
      const hook = context.sharedData.tieHook as IFEntity;

      if (!balloon || !hook) return;

      const balloonState = balloon.get(BalloonStateTrait);
      const hookId = (hook as any).hookId || 'hook1';

      if (!balloonState) return;

      balloonState.tetheredTo = hookId;
      balloonState.daemonEnabled = false;

      context.sharedData.tieSuccess = true;
    } else if (scenario === 'railing') {
      // Dome Room railing tying
      const room = context.sharedData.tieRoom as IFEntity;
      const rope = context.sharedData.tieRope as IFEntity;
      const { world } = context;

      if (!room || !rope) return;

      // Mark rope as attached
      (room as any).ropeAttached = true;

      // Move rope to the room (it's now tied there)
      world.moveEntity(rope.id, room.id);

      // Mark rope as scenery now (can't be taken)
      const identity = rope.get(IdentityTrait);
      if (identity) {
        identity.description = 'A rope is tied to the railing, dangling down into the darkness below.';
      }

      // Enable DOWN exit - find Torch Room
      // The room should have torchRoomId set when created
      const torchRoomId = (room as any).torchRoomId;
      if (torchRoomId) {
        const roomTrait = room.get(RoomTrait);
        if (roomTrait) {
          roomTrait.exits[Direction.DOWN] = { destination: torchRoomId };
        }
      }

      context.sharedData.tieSuccess = true;
      context.sharedData.tieRailingSuccess = true;
    }
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: TIE_ACTION_ID,
      messageId: result.error || TieMessages.NO_RAILING,
      reason: result.error
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];

    if (!context.sharedData.tieSuccess) {
      return events;
    }

    if (context.sharedData.tieRailingSuccess) {
      // Dome Room scenario
      events.push(context.event('game.message', {
        messageId: TieMessages.ROPE_TIED_TO_RAILING,
        params: {}
      }));
    } else {
      // Balloon scenario
      events.push(context.event('game.message', {
        messageId: TieMessages.SUCCESS,
        params: {}
      }));
    }

    return events;
  }
};
