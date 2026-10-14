/**
 * Language content for the asking-for action (ADR-372 D3): a request for a
 * thing, refused by default; a story's clause hands it over in its place.
 */

export const askingForLanguage = {
  actionId: 'if.action.asking_for',

  patterns: [
    'ask [someone] for [something]',
    'beg [someone] for [something]'
  ],

  messages: {
    // Refusals
    'no_target': "Ask whom?",
    'no_item': "Ask {the recipient} for what?",
    'not_visible': "{You} {can't} see {the recipient}.",
    'too_far': "{capitalize the recipient} {verb:is recipient} too far away.",
    'not_actor': "{You} can only ask people for things.",
    'self': "{You} can't ask {yourself} for things.",
    'already_have': "{You} already {have} {the item}.",

    // The stock line (a story's reaction usually speaks in its place)
    'refused': "{capitalize the recipient} {verb:doesn't recipient} seem inclined to hand over {the item}."
  },

  help: {
    description: 'Ask someone for a thing. Stories decide whether they hand it over.',
    examples: 'ask the grocer for the apple, beg the guard for the key',
    summary: 'ASK FOR - Ask someone for a thing. Stories decide whether they hand it over. Example: ASK THE GROCER FOR THE APPLE'
  }
};
