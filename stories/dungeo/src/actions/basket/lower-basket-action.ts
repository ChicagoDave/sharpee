/**
 * Lower Basket Action
 *
 * Lowers the basket from Shaft Room to Bottom of Shaft.
 * If player is in the basket, they descend with it.
 *
 * Patterns: "lower basket", "lower the basket"
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { LOWER_BASKET_ACTION_ID, BasketActionMessages } from './types';
import {
  lowerBasket,
  getBasketPosition,
  canOperateBasket
} from '../../handlers/basket-handler';

/**
 * Lower Basket Action Definition
 */
export const lowerBasketAction: Action = {
  id: LOWER_BASKET_ACTION_ID,
  group: 'manipulation',

  validate(context: ActionContext): ValidationResult {
    const { world, player } = context;

    // Check if player can operate the basket from current location
    if (!canOperateBasket(world, player.id)) {
      return {
        valid: false,
        error: BasketActionMessages.CANT_REACH
      };
    }

    // Check if basket is already at bottom
    const position = getBasketPosition(world);
    if (position === 'bottom') {
      return {
        valid: false,
        error: BasketActionMessages.BASKET_ALREADY_BOTTOM
      };
    }

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world, player, sharedData } = context;

    const result = lowerBasket(world, player.id);
    sharedData.basketResult = result;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: LOWER_BASKET_ACTION_ID,
      messageId: result.error || BasketActionMessages.CANT_REACH,
      reason: result.error
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const { sharedData } = context;
    const events: ISemanticEvent[] = [];

    const result = sharedData.basketResult as {
      success: boolean;
      message: string;
      playerMoved: boolean;
    } | undefined;

    if (!result) return events;

    if (result.success) {
      // Wheel turning sound
      events.push(context.event('dungeo.event.basket', {
        messageId: BasketActionMessages.WHEEL_TURN,
        direction: 'down'
      }));

      // Basket movement message
      events.push(context.event('dungeo.event.basket', {
        messageId: result.message,
        direction: 'down',
        playerMoved: result.playerMoved
      }));
    }

    return events;
  }
};
