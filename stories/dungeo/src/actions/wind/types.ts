/**
 * Wind Action Types
 *
 * Used for winding the clockwork canary in forest locations
 * to make it sing and reveal the brass bauble (2 points).
 */

export const WIND_ACTION_ID = 'dungeo.action.wind' as const;

export const WindMessages = {
  SUCCESS: 'dungeo.wind.success',
  CANARY_SINGS: 'dungeo.wind.canary_sings',
  BAUBLE_APPEARS: 'dungeo.wind.bauble_appears',
  NOT_IN_FOREST: 'dungeo.wind.not_in_forest',
  NO_TARGET: 'dungeo.wind.no_target',
  NOT_WINDABLE: 'dungeo.wind.not_windable',
  NOT_HOLDING: 'dungeo.wind.not_holding',
  ALREADY_WOUND: 'dungeo.wind.already_wound',
} as const;
