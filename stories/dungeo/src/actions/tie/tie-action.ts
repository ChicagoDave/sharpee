/**
 * Tie Action - Tie braided rope to hooks for balloon docking
 *
 * FORTRAN: Sets BTIEF to hook ID, disables balloon daemon (CFLAG(CEVBAL)=.FALSE.)
 *
 * Usage:
 * - TIE ROPE TO HOOK
 * - TIE ROPE
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait, IFEntity } from '@sharpee/world-model';
import { TIE_ACTION_ID, TieMessages } from './types';
import { BalloonState, isLedgePosition } from '../../regions/volcano/objects/balloon-objects';

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
 * Tie Action
 */
export const tieAction: Action = {
  id: TIE_ACTION_ID,
  group: 'manipulation',

  validate(context: ActionContext): ValidationResult {
    const { world, player } = context;

    // Check if player is in the balloon
    const playerLocation = world.getLocation(player.id);
    if (!playerLocation) {
      return { valid: false, error: TieMessages.NOT_IN_BALLOON };
    }

    const locationEntity = world.getEntity(playerLocation);
    if (!locationEntity || !isBalloon(locationEntity)) {
      return { valid: false, error: TieMessages.NOT_IN_BALLOON };
    }

    const balloon = locationEntity;
    const balloonState = (balloon as any).balloonState as BalloonState | undefined;

    // Check if balloon is at a ledge position
    if (!balloonState || !isLedgePosition(balloonState.position)) {
      return { valid: false, error: TieMessages.NOT_AT_LEDGE };
    }

    // Check if already tied
    if (balloonState.tetheredTo) {
      return { valid: false, error: TieMessages.ALREADY_TIED };
    }

    // Find the wire and hook in the balloon (wire dangles from the basket)
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
    context.sharedData.tieBalloon = balloon;
    context.sharedData.tieWire = wire;
    context.sharedData.tieHook = hook;

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const balloon = context.sharedData.tieBalloon as IFEntity;
    const hook = context.sharedData.tieHook as IFEntity;

    if (!balloon || !hook) return;

    // Get balloon state
    const balloonState = (balloon as any).balloonState as BalloonState;
    const hookId = (hook as any).hookId || 'hook1';

    // Tie the balloon
    balloonState.tetheredTo = hookId;
    balloonState.daemonEnabled = false;

    context.sharedData.tieSuccess = true;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: TIE_ACTION_ID,
      messageId: result.error || TieMessages.NOT_IN_BALLOON,
      reason: result.error
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];

    if (!context.sharedData.tieSuccess) {
      return events;
    }

    events.push(context.event('game.message', {
      messageId: TieMessages.SUCCESS,
      params: {}
    }));

    return events;
  }
};
