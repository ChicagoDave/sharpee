/**
 * Basket Action Types
 */

export const LOWER_BASKET_ACTION_ID = 'dungeo.action.lower_basket';
export const RAISE_BASKET_ACTION_ID = 'dungeo.action.raise_basket';

export const BasketActionMessages = {
  // Success messages
  BASKET_LOWERED: 'dungeo.basket.lowered',
  BASKET_RAISED: 'dungeo.basket.raised',
  BASKET_DESCENDS: 'dungeo.basket.descends',
  BASKET_ASCENDS: 'dungeo.basket.ascends',
  WHEEL_TURN: 'dungeo.basket.wheel_turn',

  // Error messages
  BASKET_ALREADY_TOP: 'dungeo.basket.already_top',
  BASKET_ALREADY_BOTTOM: 'dungeo.basket.already_bottom',
  BASKET_NOT_HERE: 'dungeo.basket.not_here',
  CANT_REACH: 'dungeo.basket.cant_reach'
};
