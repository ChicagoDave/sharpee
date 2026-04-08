/**
 * Propagation message IDs (ADR-144)
 *
 * Semantic message IDs for NPC-to-NPC information propagation events.
 * Actual text is provided by the language layer (lang-en-us).
 *
 * Public interface: PropagationMessages.
 * Owner context: @sharpee/character / propagation
 */

/**
 * Platform default message IDs for propagation visibility.
 * Keyed by coloring; authors override per-fact via FactOverride.witnessed.
 */
export const PropagationMessages = {
  // -------------------------------------------------------------------------
  // Witnessed messages — player sees NPC-to-NPC information exchange
  // -------------------------------------------------------------------------

  /** Neutral telling: "{speaker} mentions {topic} to {listener}." */
  WITNESSED_NEUTRAL: 'character.propagation.witnessed.neutral',
  /** Dramatic telling: "{speaker} excitedly tells {listener} about {topic}." */
  WITNESSED_DRAMATIC: 'character.propagation.witnessed.dramatic',
  /** Vague telling: "{speaker} vaguely alludes to {topic} near {listener}." */
  WITNESSED_VAGUE: 'character.propagation.witnessed.vague',
  /** Fearful telling: "{speaker} nervously whispers about {topic} to {listener}." */
  WITNESSED_FEARFUL: 'character.propagation.witnessed.fearful',
  /** Conspiratorial telling: "{speaker} leans close to {listener}, muttering about {topic}." */
  WITNESSED_CONSPIRATORIAL: 'character.propagation.witnessed.conspiratorial',

  // -------------------------------------------------------------------------
  // Eavesdropped — player overhears a full exchange
  // -------------------------------------------------------------------------

  /** Player overhears NPC-to-NPC exchange. */
  EAVESDROPPED: 'character.propagation.eavesdropped',
} as const;

/** Type for propagation message IDs. */
export type PropagationMessageId = (typeof PropagationMessages)[keyof typeof PropagationMessages];
