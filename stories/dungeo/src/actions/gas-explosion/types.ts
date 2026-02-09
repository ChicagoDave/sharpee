/**
 * Gas Explosion Death Action Types
 *
 * Player dies when bringing an open flame into the Gas Room.
 */

export const GAS_EXPLOSION_ACTION_ID = 'dungeo.action.gas_explosion';

export const GasExplosionMessages = {
  DEATH: 'dungeo.gas.explosion_death',
  LIGHT_DEATH: 'dungeo.gas.light_death'
} as const;
