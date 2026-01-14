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
    'if.lower.no_target': "Lower what?",
    'if.lower.cant_lower_that': "{You} {can't} lower {target}.",
    'if.lower.already_down': "That's already lowered.",

    // Generic success message (specific behaviors override)
    'if.lower.lowered': "{You} {lower} {target}."
  },

  help: {
    description: 'Lower something that can be lowered.',
    examples: 'lower basket, lower drawbridge, lower blinds',
    summary: 'LOWER - Lower objects like baskets, drawbridges, or blinds. Example: LOWER BASKET'
  }
};
