/**
 * Character model message IDs (ADR-141)
 *
 * Semantic message IDs for character state change events.
 * Actual text is provided by the language layer.
 *
 * Public interface: CharacterMessages const, CharacterMessageId type.
 * Owner context: stdlib / npc
 */

/**
 * Message IDs for character model state change events.
 *
 * These are emitted as observable behavior events when an NPC's
 * cognitive or emotional state changes. Silent by default — authors
 * opt in per NPC to surface them to the player.
 */
export const CharacterMessages = {
  // Lucidity transitions
  LUCIDITY_SHIFT: 'npc.character.lucidity_shift',
  LUCIDITY_BASELINE_RESTORED: 'npc.character.lucidity_baseline_restored',

  // Cognitive events
  HALLUCINATION_ONSET: 'npc.character.hallucination_onset',

  // Mood changes
  MOOD_CHANGED: 'npc.character.mood_changed',

  // Threat changes
  THREAT_CHANGED: 'npc.character.threat_changed',

  // Disposition changes
  DISPOSITION_CHANGED: 'npc.character.disposition_changed',

  // Knowledge
  FACT_LEARNED: 'npc.character.fact_learned',
} as const;

/**
 * Type for character model message IDs.
 */
export type CharacterMessageId = (typeof CharacterMessages)[keyof typeof CharacterMessages];
