/**
 * Tie Action Types
 *
 * Used for:
 * 1. Tying braided rope to hooks to anchor the balloon
 * 2. Tying rope to railing in Dome Room to enable descent
 *
 * FORTRAN: Sets BTIEF to hook ID, disables balloon daemon.
 */

export const TIE_ACTION_ID = 'dungeo.action.tie' as const;

export const TieMessages = {
  // Balloon tying
  SUCCESS: 'dungeo.tie.success',            // "The balloon is anchored." (msg 248)
  NO_ROPE: 'dungeo.tie.no_rope',
  NOT_AT_LEDGE: 'dungeo.tie.not_at_ledge',
  ALREADY_TIED: 'dungeo.tie.already_tied',
  NO_HOOK: 'dungeo.tie.no_hook',
  NOT_IN_BALLOON: 'dungeo.tie.not_in_balloon',
  // Dome Room rope/railing
  ROPE_TIED_TO_RAILING: 'dungeo.tie.rope_to_railing',  // "The rope is now tied to the railing."
  ROPE_ALREADY_TIED: 'dungeo.tie.rope_already_tied',  // "The rope is already tied here."
  NO_RAILING: 'dungeo.tie.no_railing',                // "There is nothing here to tie the rope to."
  NEED_ROPE: 'dungeo.tie.need_rope',                  // "You don't have any rope."
} as const;
