/**
 * Language content for the untying action (ADR-373 D6): a tied thing comes
 * free and stays where it is.
 */

export const untyingLanguage = {
  actionId: 'if.action.untying',

  patterns: [
    'untie [something]',
    'untie [something] from [something]',
    'unfasten [something]'
  ],

  messages: {
    // Refusals
    'no_target': "Untie what?",
    'not_tied': "{capitalize the item} {verb:isn't item} tied to anything.",

    // Success
    'untied': "{You} {untie} {the item}."
  },

  help: {
    description: 'Untie a thing you or someone else tied.',
    examples: 'untie the rope, untie the line from the cleat',
    summary: 'UNTIE - Untie a tied thing. Example: UNTIE ROPE'
  }
};
