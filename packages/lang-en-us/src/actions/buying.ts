/**
 * Language content for the buying action (ADR-372 D5): a priced thing's
 * registered implementation owns the sale; these are the refusals and the
 * standard line.
 */

export const buyingLanguage = {
  actionId: 'if.action.buying',

  patterns: [
    'buy [something]',
    'purchase [something]',
    'pay for [something]'
  ],

  messages: {
    // Refusals
    'no_target': "Buy what?",
    'not_for_sale': "{capitalize the target} {verb:isn't target} for sale.",
    'already_have': "{You} already {have} {the target}.",
    'cant_afford': "{You} can't afford {the target}.",

    // Success
    'bought': "{You} {buy} {the target}."
  },

  help: {
    description: 'Buy something that has a price, if you can afford it.',
    examples: 'buy the ration bar, purchase the map',
    summary: 'BUY - Buy something that has a price, if you can afford it. Example: BUY THE RATION BAR'
  }
};
