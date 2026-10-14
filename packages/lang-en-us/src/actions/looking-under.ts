/**
 * Language content for the looking-under action (ADR-370 D3, D5): looking
 * under a thing reveals the concealed things it holds, else the stock line.
 */

export const lookingUnderLanguage = {
  actionId: 'if.action.looking_under',

  patterns: [
    'look under [something]',
    'look beneath [something]'
  ],

  messages: {
    // Refusals
    'no_target': "Look under what?",

    // The stock line, and the reveal
    'nothing_under': "{You} {find} nothing under {the target}.",
    'found_under': "Under {the target} {you} {find} {items}."
  },

  help: {
    description: 'Look under something for anything hidden there.',
    examples: 'look under the bed, look beneath the mat',
    summary: 'LOOK UNDER - Look under something for anything hidden there. Example: LOOK UNDER THE BED'
  }
};
