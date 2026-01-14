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
    'if.raise.no_target': "Raise what?",
    'if.raise.cant_raise_that': "{You} {can't} raise {target}.",
    'if.raise.already_up': "That's already raised.",

    // Generic success message (specific behaviors override)
    'if.raise.raised': "{You} {raise} {target}."
  },

  help: {
    description: 'Raise or lift something.',
    examples: 'raise basket, raise drawbridge, lift blinds',
    summary: 'RAISE/LIFT - Raise or lift objects like baskets or drawbridges. Example: RAISE BASKET'
  }
};
