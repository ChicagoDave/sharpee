/**
 * Language content for conversation system (ADR-142)
 *
 * Platform default messages for response action framing, cognitive
 * speech patterns, between-turn commentary, and attention management.
 * Authors override per-NPC; these serve as fallbacks.
 *
 * Owner context: @sharpee/lang-en-us / npc
 */

export const conversationLanguage = {
  messages: {
    // -----------------------------------------------------------------------
    // Response action framing
    // -----------------------------------------------------------------------

    'character.conversation.response.deflect':
      '{verbatim:npcName} changes the subject.',
    'character.conversation.response.refuse':
      '{verbatim:npcName} refuses to discuss that.',
    'character.conversation.response.confabulate':
      '{verbatim:npcName} seems to be filling in the gaps from memory.',
    'character.conversation.response.omit':
      '{verbatim:npcName} says nothing about that.',

    // -----------------------------------------------------------------------
    // Cognitive speech patterns
    // -----------------------------------------------------------------------

    'character.conversation.cognitive.fragmented':
      '{verbatim:npcName} speaks in broken fragments, losing the thread mid-sentence.',
    'character.conversation.cognitive.drifting':
      '{verbatim:npcName} trails off, attention wandering to something only they can see.',
    'character.conversation.cognitive.detached':
      '{verbatim:npcName} responds flatly, as if reciting from a great distance.',

    // -----------------------------------------------------------------------
    // Between-turn defaults
    // -----------------------------------------------------------------------

    'character.conversation.between.eager.1':
      '{verbatim:npcName} watches you expectantly.',
    'character.conversation.between.eager.3':
      '{verbatim:npcName} clears their throat, waiting for your attention.',
    'character.conversation.between.reluctant.1':
      '{verbatim:npcName} seems relieved you\'re occupied.',
    'character.conversation.between.hostile.1':
      '{verbatim:npcName} glares at you impatiently.',
    'character.conversation.between.confessing.1':
      '{verbatim:npcName} shifts uncomfortably, as though wanting to say more.',
    'character.conversation.between.confessing.3':
      '{verbatim:npcName} opens their mouth, then closes it again.',
    'character.conversation.between.neutral.3':
      '{verbatim:npcName} seems to lose interest in the conversation.',

    // -----------------------------------------------------------------------
    // Attention / lifecycle
    // -----------------------------------------------------------------------

    'character.conversation.attention.yields':
      '{verbatim:npcName} steps aside, yielding the conversation.',
    'character.conversation.attention.protests':
      '{verbatim:npcName} frowns as you turn away. "I wasn\'t finished."',
    'character.conversation.attention.blocks':
      '{verbatim:npcName} steps in front of you. "We\'re not done here."',
    'character.conversation.ends':
      '{verbatim:npcName} nods, ending the conversation.',
    'character.conversation.initiates':
      '{verbatim:npcName} approaches you. "A word, if you please."',
  },
};
