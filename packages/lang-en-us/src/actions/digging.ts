/**
 * English language content for the digging action (ADR-230 D3c)
 *
 * The generic `dig` success line is a fallback — a diggable entity's own
 * registered implementation (capability behavior or `on digging it`
 * interceptor) normally overrides the narration.
 */

export const diggingLanguage = {
  actionId: 'if.action.digging',

  patterns: [
    'dig [something] with [something]'
  ],

  messages: {
    'no_target': "Dig what?",
    'not_diggable': "{capitalize the item} {verb:is item} not something {you} can dig.",
    'cant_dig': "Digging {the item} would achieve nothing here.",
    'no_tool': "{You} {need} something to dig {the item} with.",
    'tool_not_held': "{You} {need} to be holding {the tool}.",
    'wrong_tool': "{capitalize the tool} won't dig {the item}.",
    'dug': "{You} {dig} {the item}."
  },

  help: {
    description: 'Dig things that can be dug, usually with a tool.',
    examples: 'dig sand with shovel',
    summary: 'CUT - Cut something with a suitable tool. Example: DIG SAND WITH SHOVEL'
  }
};
