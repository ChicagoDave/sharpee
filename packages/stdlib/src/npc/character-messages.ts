/**
 * Character model state-change event types (ADR-141; ADR-318 D11)
 *
 * AUTHOR-CHANNEL ONLY (ADR-310 D12, retired as player surface in the
 * ADR-310/318 Phase 2 integration): these event types are projected by
 * the `character` channel for authoring tools and have no language-layer
 * rendering — no ID here may ever gain a player-facing prose path.
 *
 * Public interface: CharacterMessages const, CharacterMessageId type.
 * Owner context: stdlib / npc
 */

/**
 * Event types for character model state changes, emitted when an NPC's
 * cognitive or emotional state changes and consumed by the `character`
 * author channel ("explain this NPC's turn").
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
