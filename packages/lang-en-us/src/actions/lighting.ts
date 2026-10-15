/**
 * Language content for the lighting action (ADR-374 D9): a lantern, a
 * candle, a lamp lit — with its tool when it needs one. A switchable light
 * is switched on, and speaks switching on's lines.
 */

export const lightingLanguage = {
  actionId: 'if.action.lighting',

  patterns: [
    'light [something]',
    'light [something] with [something]'
  ],

  messages: {
    // Refusals
    'no_target': "Light what?",
    'not_light_source': "{capitalize the target} isn't something {you} can light.",
    'already_lit': "{capitalize the target} {verb:is target} already lit.",
    'no_fuel': "{capitalize the target} won't light; it has nothing left to burn.",
    'no_tool': "{You} {need} something to light {the item} with.",
    'needs_tool': "{You} {need} {the tool} to light {the item}.",
    'tool_not_held': "{You} {aren't} holding {the tool}.",
    'wrong_tool': "{capitalize the tool} won't light {the item}.",

    // Success
    'lit': "{You} {light} {the target}.",
    'lit_in_darkness': "{You} {light} {the target}, and the darkness draws back."
  },

  help: {
    description: 'Light a lantern, a candle or a lamp, with a match or a flame if it needs one.',
    examples: 'light the lantern, light the candle with the match',
    summary: 'LIGHT - Light a lantern, a candle or a lamp. Example: LIGHT THE CANDLE WITH THE MATCH'
  }
};
