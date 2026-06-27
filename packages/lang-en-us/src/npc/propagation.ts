/**
 * Language content for propagation system (ADR-144)
 *
 * Platform default witnessed messages per propagation coloring.
 * Authors override per-fact via FactOverride.witnessed.
 *
 * Owner context: @sharpee/lang-en-us / npc
 */

export const propagationLanguage = {
  messages: {
    // -----------------------------------------------------------------------
    // Witnessed messages — player sees NPC-to-NPC information exchange
    // -----------------------------------------------------------------------

    'character.propagation.witnessed.neutral':
      '{verbatim:speakerName} mentions something to {verbatim:listenerName}.',
    'character.propagation.witnessed.dramatic':
      '{verbatim:speakerName} excitedly tells {verbatim:listenerName} about something.',
    'character.propagation.witnessed.vague':
      '{verbatim:speakerName} vaguely alludes to something near {verbatim:listenerName}.',
    'character.propagation.witnessed.fearful':
      '{verbatim:speakerName} nervously whispers something to {verbatim:listenerName}.',
    'character.propagation.witnessed.conspiratorial':
      '{verbatim:speakerName} leans close to {verbatim:listenerName}, muttering under their breath.',

    // -----------------------------------------------------------------------
    // Eavesdropped — player overhears a full exchange
    // -----------------------------------------------------------------------

    'character.propagation.eavesdropped':
      'You overhear {verbatim:speakerName} speaking to {verbatim:listenerName}.',
  },
};
