/**
 * Untie Action Types
 *
 * Used for untying the braided rope from hooks to release the balloon.
 * FORTRAN: Clears BTIEF, re-enables balloon daemon (CTICK=3).
 */

export const UNTIE_ACTION_ID = 'dungeo.action.untie' as const;

export const UntieMessages = {
  SUCCESS: 'dungeo.untie.success',          // "You untie the rope." (msg 250)
  NOT_TIED: 'dungeo.untie.not_tied',        // "The rope isn't tied to anything." (msg 249)
  NO_ROPE: 'dungeo.untie.no_rope',
} as const;
