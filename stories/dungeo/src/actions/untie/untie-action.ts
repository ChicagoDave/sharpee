/**
 * Untie Action - Untie braided rope from hook to release balloon
 *
 * FORTRAN: Clears BTIEF, re-enables balloon daemon (CFLAG(CEVBAL)=.TRUE., CTICK=3)
 *
 * Usage:
 * - UNTIE ROPE
 * - UNTIE
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait, IFEntity } from '@sharpee/world-model';
import { UNTIE_ACTION_ID, UntieMessages } from './types';
import { BalloonStateTrait } from '../../traits';

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
 * Untie Action
 */
export const untieAction: Action = {
  id: UNTIE_ACTION_ID,
  group: 'manipulation',

  validate(context: ActionContext): ValidationResult {
    const { world, player } = context;

    // Check if player is in the balloon
    const playerLocation = world.getLocation(player.id);
    if (!playerLocation) {
      return { valid: false, error: UntieMessages.NO_ROPE };
    }

    const locationEntity = world.getEntity(playerLocation);
    if (!locationEntity || !isBalloon(locationEntity)) {
      return { valid: false, error: UntieMessages.NO_ROPE };
    }

    const balloon = locationEntity;
    const balloonState = balloon.get(BalloonStateTrait);

    // Check if balloon is actually tied
    if (!balloonState || !balloonState.tetheredTo) {
      return { valid: false, error: UntieMessages.NOT_TIED };
    }

    // Find the wire in the balloon (wire dangles from the basket)
    const balloonContents = world.getContents(balloon.id);
    const wire = balloonContents.find(e => isBraidedWire(e));

    if (!wire) {
      return { valid: false, error: UntieMessages.NO_ROPE };
    }

    // Store for execute phase
    context.sharedData.untieBalloon = balloon;
    context.sharedData.untieWire = wire;

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const balloon = context.sharedData.untieBalloon as IFEntity;

    if (!balloon) return;

    // Get balloon state
    const balloonState = balloon.get(BalloonStateTrait);

    if (!balloonState) return;

    // Untie the balloon
    balloonState.tetheredTo = null;
    balloonState.daemonEnabled = true;

    // Note: The balloon daemon should restart with 3-turn countdown
    // This will be handled by the daemon registration logic

    context.sharedData.untieSuccess = true;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: UNTIE_ACTION_ID,
      messageId: result.error || UntieMessages.NO_ROPE,
      reason: result.error
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];

    if (!context.sharedData.untieSuccess) {
      return events;
    }

    events.push(context.event('game.message', {
      messageId: UntieMessages.SUCCESS,
      params: {}
    }));

    return events;
  }
};
