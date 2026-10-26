/**
 * Language content for the waving action (ADR-370 D3): the hands form and
 * the held-thing form share one action; each has its stock line.
 */

export const wavingLanguage = {
  actionId: 'if.action.waving',

  patterns: [
    'wave',
    'wave hands',
    'wave [something]'
  ],

  messages: {
    // Refusals
    'not_held': "{You} {aren't} holding {the target}.",

    // The stock lines
    'waved_hands': "{You} {wave}. Nobody waves back.",
    'waved': "{You} {wave} {the target} about. Nothing happens."
  },

  help: {
    description: 'Wave your hands, or wave something you are holding.',
    examples: 'wave, wave hands, wave the flag',
    summary: 'WAVE - Wave your hands, or wave something you are holding. Example: WAVE THE FLAG'
  }
};
