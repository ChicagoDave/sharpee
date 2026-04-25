/**
 * Language content for lowering action (ADR-090 capability dispatch)
 *
 * This action dispatches to trait behaviors. Default messages are provided
 * here, but specific behaviors may emit custom message IDs.
 */

export const loweringLanguage = {
  actionId: 'if.action.lowering',

  patterns: [
    'lower [something]'
  ],

  messages: {
    // Error messages (used by capability dispatch)
    'no_target': "Lower what?",
    'cant_lower_that': "{You} {can't} lower {the:target}.",
    'already_down': "That's already lowered.",

    // Generic success message (specific behaviors override)
    'lowered': "{You} {lower} {the:target}."
  },

  help: {
    description: 'Lower something that can be lowered.',
    examples: 'lower basket, lower drawbridge, lower blinds',
    summary: 'LOWER - Lower objects like baskets, drawbridges, or blinds. Example: LOWER BASKET'
  }
};
