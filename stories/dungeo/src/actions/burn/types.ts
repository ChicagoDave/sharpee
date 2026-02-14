/**
 * Burn Action Types - Story-specific action for burning items
 *
 * Used for burning incense (ghost ritual) and fuse wire (brick explosion).
 */

// Action ID
export const BURN_ACTION_ID = 'DUNGEO_BURN' as const;

// Message IDs
export const BurnMessages = {
  BURN_SUCCESS: 'dungeo.burn.success',
  BURN_INCENSE: 'dungeo.burn.incense',
  BURN_FUSE: 'dungeo.burn.fuse',
  ALREADY_BURNING: 'dungeo.burn.already_burning',
  BURNED_OUT: 'dungeo.burn.burned_out',
  CANT_BURN: 'dungeo.burn.cant_burn',
  NO_TARGET: 'dungeo.burn.no_target',
  NOT_VISIBLE: 'dungeo.burn.not_visible',
} as const;
