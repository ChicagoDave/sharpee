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
      '{speakerName} mentions something to {listenerName}.',
    'character.propagation.witnessed.dramatic':
      '{speakerName} excitedly tells {listenerName} about something.',
    'character.propagation.witnessed.vague':
      '{speakerName} vaguely alludes to something near {listenerName}.',
    'character.propagation.witnessed.fearful':
      '{speakerName} nervously whispers something to {listenerName}.',
    'character.propagation.witnessed.conspiratorial':
      '{speakerName} leans close to {listenerName}, muttering under their breath.',

    // -----------------------------------------------------------------------
    // Eavesdropped — player overhears a full exchange
    // -----------------------------------------------------------------------

    'character.propagation.eavesdropped':
      'You overhear {speakerName} speaking to {listenerName}.',
  },
};
