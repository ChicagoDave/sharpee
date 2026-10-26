/**
 * Language content for the burning action (ADR-371 D2, D5): a flammable
 * thing's one implementation owns the outcome; these are the refusals and
 * the generic line it usually speaks over.
 */

export const burningLanguage = {
  actionId: 'if.action.burning',

  patterns: [
    'burn [something]',
    'burn [something] with [something]',
    'ignite [something]',
    'set fire to [something]'
  ],

  messages: {
    // Error messages
    'no_target': "Burn what?",
    'not_flammable': "{capitalize the item} isn't something {you} can burn.",
    'cant_burn': "Burning {the item} would achieve nothing here.",
    'no_tool': "{You} {need} something to burn {the item} with.",
    'needs_tool': "{You} {need} {the tool} to burn {the item}.",
    'tool_not_held': "{You} {aren't} holding {the tool}.",
    'wrong_tool': "{capitalize the tool} won't burn {the item}.",

    // Success (the implementation usually speaks in its place)
    'burned': "{You} {set} fire to {the item}."
  },

  help: {
    description: 'Burn something flammable, with the right tool if it needs one.',
    examples: 'burn the letter, burn the rope with the torch',
    summary: 'BURN - Burn something flammable, with the right tool if it needs one. Example: BURN THE LETTER WITH THE TORCH'
  }
};
