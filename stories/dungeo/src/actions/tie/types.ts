/**
 * Tie Action Types
 *
 * Used for tying the braided rope to hooks to anchor the balloon.
 * FORTRAN: Sets BTIEF to hook ID, disables balloon daemon.
 */

export const TIE_ACTION_ID = 'dungeo.action.tie' as const;

export const TieMessages = {
  SUCCESS: 'dungeo.tie.success',            // "The balloon is anchored." (msg 248)
  NO_ROPE: 'dungeo.tie.no_rope',
  NOT_AT_LEDGE: 'dungeo.tie.not_at_ledge',
  ALREADY_TIED: 'dungeo.tie.already_tied',
  NO_HOOK: 'dungeo.tie.no_hook',
  NOT_IN_BALLOON: 'dungeo.tie.not_in_balloon',
} as const;
