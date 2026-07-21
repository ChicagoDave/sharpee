/**
 * Gas Explosion Death Action
 *
 * Triggered when player brings an open flame into the Gas Room
 * or lights a flame source while in the Gas Room.
 * Per MDL source (act3.199) - immediate death.
 */

import { Action, ActionContext, ValidationResult, killPlayer } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { GAS_EXPLOSION_ACTION_ID, GasExplosionMessages } from './types';

export const gasExplosionAction: Action = {
  id: GAS_EXPLOSION_ACTION_ID,
  group: 'special',

  validate(_context: ActionContext): ValidationResult {
    // Always valid - explosion is inevitable
    return { valid: true };
  },

  execute(context: ActionContext): void {
    // Canonical terminal death (ADR-224). Death text depends on how the explosion
    // was triggered (entering vs. lighting a flame); resolve the messageId here.
    const explosionType = context.command.parsed.extras?.explosionType || 'enter';
    const messageId = explosionType === 'light'
      ? GasExplosionMessages.LIGHT_DEATH
      : GasExplosionMessages.DEATH;

    (context.sharedData as { deathEvent?: ISemanticEvent | null }).deathEvent =
      killPlayer(context.world, context.player, {
        cause: 'gas_explosion',
        messageId,
        terminal: true,
      });
  },

  blocked(_context: ActionContext, _result: ValidationResult): ISemanticEvent[] {
    return [];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const event = (context.sharedData as { deathEvent?: ISemanticEvent | null }).deathEvent;
    return event ? [event] : [];
  }
};
