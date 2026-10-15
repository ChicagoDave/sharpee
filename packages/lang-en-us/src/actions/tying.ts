/**
 * Language content for the tying action (ADR-373 D6): a held thing tied,
 * fastened or attached to an anchor; it stays there until untied or pulled
 * free.
 */

export const tyingLanguage = {
  actionId: 'if.action.tying',

  patterns: [
    'tie [something] to [something]',
    'fasten [something] to [something]',
    'attach [something] to [something]',
    'tie [something]'
  ],

  messages: {
    // Refusals
    'no_target': "Tie what?",
    'no_anchor': "What do {you} want to tie {the item} to?",
    'self': "{You} can't tie {the item} to itself.",
    'not_to_people': "{You} can't tie things to people.",

    // Success
    'tied': "{You} {tie} {the item} to {the anchor}."
  },

  help: {
    description: 'Tie a thing to something. It stays there until you untie it.',
    examples: 'tie the rope to the railing, fasten the line to the cleat',
    summary: 'TIE - Tie a thing to something. It stays there until you untie it. Example: TIE ROPE TO RAILING'
  }
};
