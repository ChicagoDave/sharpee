/**
 * Raise Basket Action
 *
 * Raises the basket from Bottom of Shaft to Shaft Room.
 * If player is in the basket, they ascend with it.
 *
 * Patterns: "raise basket", "raise the basket"
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { RAISE_BASKET_ACTION_ID, BasketActionMessages } from './types';
import {
  raiseBasket,
  getBasketPosition,
  canOperateBasket
} from '../../handlers/basket-handler';

/**
 * Raise Basket Action Definition
 */
export const raiseBasketAction: Action = {
  id: RAISE_BASKET_ACTION_ID,
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

    // Check if basket is already at top
    const position = getBasketPosition(world);
    if (position === 'top') {
      return {
        valid: false,
        error: BasketActionMessages.BASKET_ALREADY_TOP
      };
    }

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world, player, sharedData } = context;

    const result = raiseBasket(world, player.id);
    sharedData.basketResult = result;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: RAISE_BASKET_ACTION_ID,
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
        direction: 'up'
      }));

      // Basket movement message
      events.push(context.event('dungeo.event.basket', {
        messageId: result.message,
        direction: 'up',
        playerMoved: result.playerMoved
      }));
    }

    return events;
  }
};
