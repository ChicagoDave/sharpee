/**
 * English language content for the cutting action (ADR-230 D3c)
 *
 * The generic `cut` success line is a fallback — a cuttable entity's own
 * registered implementation (capability behavior or `on cutting it`
 * interceptor) normally overrides the narration.
 */

export const cuttingLanguage = {
  actionId: 'if.action.cutting',

  patterns: [
    'cut [something] with [something]',
    'cut [something]'
  ],

  messages: {
    'no_target': "Cut what?",
    'not_cuttable': "{capitalize the item} {verb:is item} not something {you} can cut.",
    'cant_cut': "Cutting {the item} would achieve nothing here.",
    'no_tool': "{You} {need} something to cut {the item} with.",
    'tool_not_held': "{You} {need} to be holding {the tool}.",
    'wrong_tool': "{capitalize the tool} won't cut {the item}.",
    'cut': "{You} {cut} {the item}."
  },

  help: {
    description: 'Cut things that can be cut, usually with a tool.',
    examples: 'cut rope with knife',
    summary: 'CUT - Cut something with a suitable tool. Example: CUT ROPE WITH KNIFE'
  }
};
