/**
 * Lift Action Types - Raise objects like poles
 *
 * Used primarily for raising the short pole in the Inside Mirror puzzle.
 */

// Action ID
export const LIFT_ACTION_ID = 'DUNGEO_LIFT' as const;

// Message IDs
export const LiftMessages = {
  LIFT_SUCCESS: 'dungeo.lift.success',
  LIFT_POLE: 'dungeo.mirror.pole_raised',
  POLE_ALREADY_RAISED: 'dungeo.mirror.pole_already_raised',
  CANT_LIFT: 'dungeo.lift.cant_lift',
  NO_TARGET: 'dungeo.lift.no_target',
  NOT_VISIBLE: 'dungeo.lift.not_visible',
  NOT_IN_MIRROR: 'dungeo.lift.not_in_mirror',
} as const;
