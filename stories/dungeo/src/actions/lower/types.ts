/**
 * Lower Action Types - Lower objects like poles
 *
 * Used primarily for lowering the short pole in the Inside Mirror puzzle.
 */

// Action ID
export const LOWER_ACTION_ID = 'DUNGEO_LOWER' as const;

// Message IDs
export const LowerMessages = {
  LOWER_SUCCESS: 'dungeo.lower.success',
  LOWER_POLE_CHANNEL: 'dungeo.mirror.pole_lowered_channel',
  LOWER_POLE_FLOOR: 'dungeo.mirror.pole_lowered_floor',
  POLE_ALREADY_LOWERED: 'dungeo.mirror.pole_already_lowered',
  CANT_LOWER: 'dungeo.lower.cant_lower',
  NO_TARGET: 'dungeo.lower.no_target',
  NOT_VISIBLE: 'dungeo.lower.not_visible',
  NOT_IN_MIRROR: 'dungeo.lower.not_in_mirror',
} as const;
