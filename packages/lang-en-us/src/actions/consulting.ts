/**
 * Language content for the consulting action (ADR-372 D4): a readable
 * thing's topic table answers; these are the refusals and the stock line
 * a matched topic speaks over.
 */

export const consultingLanguage = {
  actionId: 'if.action.consulting',

  patterns: [
    'consult [something] about [topic]',
    'look up [topic] in [something]',
    'read about [topic] in [something]'
  ],

  messages: {
    // Refusals
    'no_target': "Consult what?",
    'no_topic': "Look up what in {the source}?",
    'not_consultable': "{capitalize the source} {verb:isn't source} something {you} can look things up in.",

    // The stock line (a matched topic usually speaks in its place)
    'nothing_found': "{You} {find} nothing about that in {the source}."
  },

  help: {
    description: 'Look a topic up in a book, a directory or a manual.',
    examples: 'consult the directory about vance, look up engines in the manual',
    summary: 'CONSULT - Look a topic up in a book, a directory or a manual. Example: CONSULT THE DIRECTORY ABOUT VANCE'
  }
};
