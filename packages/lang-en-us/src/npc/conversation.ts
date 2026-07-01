/**
 * Language content for conversation system (ADR-142)
 *
 * Platform default messages for response action framing, cognitive
 * speech patterns, between-turn commentary, and attention management.
 * Authors override per-NPC; these serve as fallbacks.
 *
 * Attribution names the NPC via a `speaker` NounPhrase (ADR-203) and agrees the
 * leading verb with it (`{verb:LEMMA speaker}`, ADR-199). Embedded literal dialogue
 * stays verbatim (ADR-200); secondary body verbs remain literal (leading-attribution
 * scope).
 *
 * Owner context: @sharpee/lang-en-us / npc
 */

export const conversationLanguage = {
  messages: {
    // -----------------------------------------------------------------------
    // Response action framing
    // -----------------------------------------------------------------------

    'character.conversation.response.deflect':
      '{capitalize the speaker} {verb:changes speaker} the subject.',
    'character.conversation.response.refuse':
      '{capitalize the speaker} {verb:declines speaker} to discuss that.',
    'character.conversation.response.confabulate':
      '{capitalize the speaker} {verb:seems speaker} to be filling in the gaps from memory.',
    'character.conversation.response.omit':
      '{capitalize the speaker} {verb:says speaker} nothing about that.',

    // -----------------------------------------------------------------------
    // Cognitive speech patterns
    // -----------------------------------------------------------------------

    'character.conversation.cognitive.fragmented':
      '{capitalize the speaker} {verb:speaks speaker} in broken fragments, losing the thread mid-sentence.',
    'character.conversation.cognitive.drifting':
      '{capitalize the speaker} {verb:trails speaker} off, attention wandering to something only they can see.',
    'character.conversation.cognitive.detached':
      '{capitalize the speaker} {verb:responds speaker} flatly, as if reciting from a great distance.',

    // -----------------------------------------------------------------------
    // Between-turn defaults
    // -----------------------------------------------------------------------

    'character.conversation.between.eager.1':
      '{capitalize the speaker} {verb:watches speaker} you expectantly.',
    'character.conversation.between.eager.3':
      '{capitalize the speaker} {verb:clears speaker} their throat, waiting for your attention.',
    'character.conversation.between.reluctant.1':
      '{capitalize the speaker} {verb:seems speaker} relieved you\'re occupied.',
    'character.conversation.between.hostile.1':
      '{capitalize the speaker} {verb:glares speaker} at you impatiently.',
    'character.conversation.between.confessing.1':
      '{capitalize the speaker} {verb:shifts speaker} uncomfortably, as though wanting to say more.',
    'character.conversation.between.confessing.3':
      '{capitalize the speaker} {verb:opens speaker} their mouth, then closes it again.',
    'character.conversation.between.neutral.3':
      '{capitalize the speaker} {verb:seems speaker} to lose interest in the conversation.',

    // -----------------------------------------------------------------------
    // Attention / lifecycle
    // -----------------------------------------------------------------------

    'character.conversation.attention.yields':
      '{capitalize the speaker} {verb:steps speaker} aside, yielding the conversation.',
    'character.conversation.attention.protests':
      '{capitalize the speaker} {verb:frowns speaker} as you turn away. "I wasn\'t finished."',
    'character.conversation.attention.blocks':
      '{capitalize the speaker} {verb:steps speaker} in front of you. "We\'re not done here."',
    'character.conversation.ends':
      '{capitalize the speaker} {verb:nods speaker}, ending the conversation.',
    'character.conversation.initiates':
      '{capitalize the speaker} {verb:approaches speaker} you. "A word, if you please."',
  },
};
