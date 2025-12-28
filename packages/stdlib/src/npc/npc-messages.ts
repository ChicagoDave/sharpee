/**
 * NPC Message IDs (ADR-070)
 *
 * Semantic message IDs for NPC-related events.
 * Actual text is provided by the language layer.
 */

/**
 * Message IDs for NPC events
 */
export const NpcMessages = {
  // Movement messages
  NPC_ENTERS: 'npc.enters',
  NPC_LEAVES: 'npc.leaves',
  NPC_ARRIVES: 'npc.arrives',
  NPC_DEPARTS: 'npc.departs',

  // Observation messages
  NPC_NOTICES_PLAYER: 'npc.notices_player',
  NPC_IGNORES_PLAYER: 'npc.ignores_player',

  // Action messages
  NPC_TAKES: 'npc.takes',
  NPC_DROPS: 'npc.drops',
  NPC_FOLLOWS: 'npc.follows',

  // Guard messages
  GUARD_BLOCKS: 'npc.guard.blocks',
  GUARD_ATTACKS: 'npc.guard.attacks',
  GUARD_DEFEATED: 'npc.guard.defeated',

  // Combat messages
  NPC_ATTACKS: 'npc.attacks',
  NPC_MISSES: 'npc.misses',
  NPC_HITS: 'npc.hits',
  NPC_KILLED: 'npc.killed',
  NPC_UNCONSCIOUS: 'npc.unconscious',

  // Speech messages
  NPC_SPEAKS: 'npc.speaks',
  NPC_SHOUTS: 'npc.shouts',
  NPC_WHISPERS: 'npc.whispers',
  NPC_MUTTERS: 'npc.mutters',

  // Emote messages
  NPC_LAUGHS: 'npc.laughs',
  NPC_GROWLS: 'npc.growls',
  NPC_CRIES: 'npc.cries',
  NPC_SIGHS: 'npc.sighs',

  // Dialogue messages
  NPC_GREETS: 'npc.greets',
  NPC_FAREWELL: 'npc.farewell',
  NPC_NO_RESPONSE: 'npc.no_response',
  NPC_CONFUSED: 'npc.confused',
} as const;

/**
 * Type for NPC message IDs
 */
export type NpcMessageId = (typeof NpcMessages)[keyof typeof NpcMessages];
