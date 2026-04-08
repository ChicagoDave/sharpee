/**
 * Influence message IDs (ADR-146)
 *
 * Semantic message IDs for influence system events.
 * Actual text is provided by the language layer (lang-en-us).
 *
 * Public interface: InfluenceMessages.
 * Owner context: @sharpee/character / influence
 */

/**
 * Platform default message IDs for influence events.
 * Authors override per-influence via InfluenceDef.witnessed / .resisted.
 */
export const InfluenceMessages = {
  // -------------------------------------------------------------------------
  // Witnessed — player sees influence being exerted
  // -------------------------------------------------------------------------

  /** Default witnessed message when target is affected. */
  WITNESSED_DEFAULT: 'character.influence.witnessed.default',
  /** Default resisted message when target resists. */
  RESISTED_DEFAULT: 'character.influence.resisted.default',

  // -------------------------------------------------------------------------
  // PC influence — player is the target
  // -------------------------------------------------------------------------

  /** Player's focus is clouded (conversation context cleared). */
  PC_FOCUS_CLOUDED: 'character.influence.pc.focus_clouded',
  /** Player's action is intercepted by influence. */
  PC_ACTION_INTERCEPTED: 'character.influence.pc.action_intercepted',

  // -------------------------------------------------------------------------
  // Duration events
  // -------------------------------------------------------------------------

  /** Influence effect wears off (momentary or lingering expired). */
  EFFECT_EXPIRED: 'character.influence.effect.expired',
  /** Influence effect cleared because influencer departed. */
  EFFECT_DEPARTED: 'character.influence.effect.departed',
} as const;

/** Type for influence message IDs. */
export type InfluenceMessageId = (typeof InfluenceMessages)[keyof typeof InfluenceMessages];
