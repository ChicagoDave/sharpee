/**
 * Language content for the extinguishing action (ADR-374 D9): a flame put
 * out. A switchable light is switched off, and speaks switching off's lines.
 */

export const extinguishingLanguage = {
  actionId: 'if.action.extinguishing',

  patterns: [
    'extinguish [something]',
    'put out [something]',
    'blow out [something]',
    'snuff [something]',
    'douse [something]'
  ],

  messages: {
    // Refusals
    'no_target': "Put out what?",
    'not_light_source': "{capitalize the target} isn't something {you} can put out.",
    'not_lit': "{capitalize the target} {verb:isn't target} lit.",

    // Success
    'extinguished': "{You} {put} out {the target}.",
    'extinguished_into_darkness': "{You} {put} out {the target}, and darkness closes in."
  },

  help: {
    description: 'Put out a lantern, a candle or a flame.',
    examples: 'put out the lantern, blow out the candle, extinguish the torch',
    summary: 'EXTINGUISH - Put out a lantern, a candle or a flame. Example: BLOW OUT THE CANDLE'
  }
};
