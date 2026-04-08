/**
 * Conversation message IDs (ADR-142)
 *
 * Semantic message IDs for conversation system events.
 * Actual text is provided by the language layer (lang-en-us).
 *
 * Public interface: ConversationMessages.
 * Owner context: @sharpee/character / conversation
 */

/**
 * Platform default message IDs for the conversation system.
 * Authors override these per-NPC; these serve as fallbacks.
 */
export const ConversationMessages = {
  // -------------------------------------------------------------------------
  // Response action framing — wraps author message with response type context
  // -------------------------------------------------------------------------

  /** Framing for deflect responses. */
  RESPONSE_DEFLECT: 'character.conversation.response.deflect',
  /** Framing for refuse responses. */
  RESPONSE_REFUSE: 'character.conversation.response.refuse',
  /** Framing for confabulate responses (NPC fills in gaps). */
  RESPONSE_CONFABULATE: 'character.conversation.response.confabulate',
  /** Framing for omit responses (NPC knows but stays silent). */
  RESPONSE_OMIT: 'character.conversation.response.omit',

  // -------------------------------------------------------------------------
  // Cognitive speech patterns — applied when NPC has cognitive state
  // -------------------------------------------------------------------------

  /** Fragmented speech (low coherence). */
  COGNITIVE_FRAGMENTED: 'character.conversation.cognitive.fragmented',
  /** Drifting speech (mid coherence, tangential). */
  COGNITIVE_DRIFTING: 'character.conversation.cognitive.drifting',
  /** Detached speech (low selfModel, flat affect). */
  COGNITIVE_DETACHED: 'character.conversation.cognitive.detached',

  // -------------------------------------------------------------------------
  // Between-turn defaults — NPC commentary when player does other things
  // -------------------------------------------------------------------------

  /** Eager NPC, first non-conversation turn. */
  BETWEEN_TURN_EAGER_1: 'character.conversation.between.eager.1',
  /** Eager NPC, third+ non-conversation turn. */
  BETWEEN_TURN_EAGER_3: 'character.conversation.between.eager.3',
  /** Reluctant NPC, first non-conversation turn. */
  BETWEEN_TURN_RELUCTANT_1: 'character.conversation.between.reluctant.1',
  /** Hostile NPC, first non-conversation turn. */
  BETWEEN_TURN_HOSTILE_1: 'character.conversation.between.hostile.1',
  /** Confessing NPC, first non-conversation turn. */
  BETWEEN_TURN_CONFESSING_1: 'character.conversation.between.confessing.1',
  /** Confessing NPC, third non-conversation turn. */
  BETWEEN_TURN_CONFESSING_3: 'character.conversation.between.confessing.3',
  /** Neutral NPC, third+ non-conversation turn (default decay). */
  BETWEEN_TURN_NEUTRAL_3: 'character.conversation.between.neutral.3',

  // -------------------------------------------------------------------------
  // Attention / lifecycle
  // -------------------------------------------------------------------------

  /** NPC yields attention when player redirects to another NPC. */
  ATTENTION_YIELDS: 'character.conversation.attention.yields',
  /** NPC protests when player redirects but doesn't block. */
  ATTENTION_PROTESTS: 'character.conversation.attention.protests',
  /** NPC blocks player from redirecting (strong attention hold). */
  ATTENTION_BLOCKS: 'character.conversation.attention.blocks',
  /** Conversation ends naturally (goodbye). */
  CONVERSATION_ENDS: 'character.conversation.ends',
  /** NPC initiates conversation. */
  CONVERSATION_INITIATES: 'character.conversation.initiates',
} as const;

/** Type for conversation message IDs. */
export type ConversationMessageId = (typeof ConversationMessages)[keyof typeof ConversationMessages];
