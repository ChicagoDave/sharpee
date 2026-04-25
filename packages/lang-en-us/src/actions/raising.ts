/**
 * Language content for raising action (ADR-090 capability dispatch)
 *
 * This action dispatches to trait behaviors. Default messages are provided
 * here, but specific behaviors may emit custom message IDs.
 */

export const raisingLanguage = {
  actionId: 'if.action.raising',

  patterns: [
    'raise [something]',
    'lift [something]'
  ],

  messages: {
    // Error messages (used by capability dispatch)
    'no_target': "Raise what?",
    'cant_raise_that': "{You} {can't} raise {the:target}.",
    'already_up': "That's already raised.",

    // Generic success message (specific behaviors override)
    'raised': "{You} {raise} {the:target}."
  },

  help: {
    description: 'Raise or lift something.',
    examples: 'raise basket, raise drawbridge, lift blinds',
    summary: 'RAISE/LIFT - Raise or lift objects like baskets or drawbridges. Example: RAISE BASKET'
  }
};
