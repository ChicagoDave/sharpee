/**
 * NPC Message IDs (ADR-070; ADR-328 D5)
 *
 * The message ids the standard behaviors narrate through
 * `NpcContext.narrate`. Actual text is provided by the language layer.
 * An NPC's ACTIONS are no longer narrated from here: a take, a move, an
 * attack renders through the action's own messages in the actor's voice
 * (ADR-328 D4), so the old `npc.takes`/`npc.enters`/`npc.attacks` family
 * has no producer and is gone.
 *
 * Public interface: NpcMessages const, NpcMessageId type.
 * Owner context: stdlib / npc
 */

/**
 * Message IDs the standard behaviors narrate
 */
export const NpcMessages = {
  // Observation messages
  NPC_NOTICES_PLAYER: 'npc.notices_player',

  // Follower
  NPC_FOLLOWS: 'npc.follows',

  // Guard
  GUARD_BLOCKS: 'npc.guard.blocks',
} as const;

/**
 * Type for NPC message IDs
 */
export type NpcMessageId = (typeof NpcMessages)[keyof typeof NpcMessages];
