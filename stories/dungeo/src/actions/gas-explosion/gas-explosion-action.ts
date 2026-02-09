/**
 * Gas Explosion Death Action
 *
 * Triggered when player brings an open flame into the Gas Room
 * or lights a flame source while in the Gas Room.
 * Per MDL source (act3.199) - immediate death.
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
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
    // Mark player as dead
    context.world.setStateValue('dungeo.player.dead', true);
    context.world.setStateValue('dungeo.player.death_cause', 'gas_explosion');
  },

  blocked(_context: ActionContext, _result: ValidationResult): ISemanticEvent[] {
    return [];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const explosionType = context.command.parsed.extras?.explosionType || 'enter';
    const messageId = explosionType === 'light'
      ? GasExplosionMessages.LIGHT_DEATH
      : GasExplosionMessages.DEATH;

    return [
      context.event('if.event.player.died', {
        messageId,
        cause: 'gas_explosion'
      })
    ];
  }
};
