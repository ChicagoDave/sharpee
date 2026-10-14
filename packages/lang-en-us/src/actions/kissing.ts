/**
 * Language content for the kissing action (ADR-370 D3): a signal action
 * with an object; the stock line depends on whether the target is a person.
 */

export const kissingLanguage = {
  actionId: 'if.action.kissing',

  patterns: [
    'kiss [something]',
    'hug [something]',
    'embrace [something]'
  ],

  messages: {
    // Refusals
    'no_target': "Kiss what?",

    // The stock lines
    'kissed_person': "{capitalize the target} {verb:is target} having none of that.",
    'kissed_thing': "{You} {kiss} {the target}. Nothing comes of it."
  },

  help: {
    description: 'Kiss someone or something. Stories decide how it is received.',
    examples: 'kiss the frog, hug the robot',
    summary: 'KISS - Kiss someone or something. Stories decide how it is received. Example: KISS THE FROG'
  }
};
