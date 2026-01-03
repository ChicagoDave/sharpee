/**
 * Wave Action Types
 *
 * Used for waving items, primarily the sceptre at Aragain Falls
 * to create a rainbow bridge to the pot of gold.
 */

export const WAVE_ACTION_ID = 'dungeo.action.wave' as const;

export const WaveMessages = {
  SUCCESS: 'dungeo.wave.success',
  RAINBOW_APPEARS: 'dungeo.wave.rainbow_appears',
  RAINBOW_GONE: 'dungeo.wave.rainbow_gone',
  NO_EFFECT: 'dungeo.wave.no_effect',
  NO_TARGET: 'dungeo.wave.no_target',
  NOT_HOLDING: 'dungeo.wave.not_holding',
} as const;
