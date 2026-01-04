/**
 * Light Action Types
 *
 * Used for lighting flammable objects with fire sources (match, candle).
 * Primary use: LIGHT GUIDEBOOK WITH MATCH to fuel the balloon.
 */

export const LIGHT_ACTION_ID = 'dungeo.action.light' as const;

export const LightMessages = {
  SUCCESS: 'dungeo.light.success',
  NO_FIRE_SOURCE: 'dungeo.light.no_fire_source',
  NOT_FLAMMABLE: 'dungeo.light.not_flammable',
  ALREADY_BURNING: 'dungeo.light.already_burning',
  GUIDEBOOK_LIT: 'dungeo.light.guidebook_lit',
  IN_RECEPTACLE: 'dungeo.light.in_receptacle',
} as const;
