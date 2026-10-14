/**
 * Language content for the saying-sorry action (ADR-370 D3): bare `sorry`.
 */

export const sayingSorryLanguage = {
  actionId: 'if.action.saying_sorry',

  patterns: [
    'sorry',
    'apologize'
  ],

  messages: {
    // The stock line
    'nothing_to_apologize_for': "There is nothing to apologize for."
  },

  help: {
    description: 'Apologize. Stories decide whether anyone is listening.',
    examples: 'sorry, apologize',
    summary: 'SORRY - Apologize. Stories decide whether anyone is listening. Example: SORRY'
  }
};
