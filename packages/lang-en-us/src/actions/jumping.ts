/**
 * Language content for the jumping action (ADR-370 D3): a signal action
 * whose stock line stands when no story reaction speaks in its place.
 */

export const jumpingLanguage = {
  actionId: 'if.action.jumping',

  patterns: [
    'jump',
    'leap',
    'hop'
  ],

  messages: {
    // The stock line
    'jumped': "{You} {jump} on the spot. Nothing comes of it."
  },

  help: {
    description: 'Jump on the spot. Stories decide what, if anything, happens.',
    examples: 'jump, leap, hop',
    summary: 'JUMP - Jump on the spot. Stories decide what, if anything, happens. Example: JUMP'
  }
};
