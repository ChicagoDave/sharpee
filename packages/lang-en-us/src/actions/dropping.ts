/**
 * English language content for the dropping action
 */

export const droppingLanguage = {
  actionId: 'if.action.dropping',
  
  patterns: [
    'drop [something]',
    'put down [something]',
    'discard [something]',
    'release [something]',
    'let go of [something]'
  ],
  
  messages: {
    'no_target': "Drop what?",
    'not_held': "{You} aren't holding {the:item}.",
    'nothing_to_drop': "{You} aren't carrying anything.",
    'dropped': "Dropped.",
    'dropped_in': "{You} {put} {the:item} in {the:container}.",
    'dropped_on': "{You} {put} {the:item} on {the:surface}.",
    // Multi-drop label format: rendered without article per IF convention
    'dropped_multi': "{item}: Dropped."
  },
  
  help: {
    description: 'Drop objects from your inventory.',
    examples: 'drop book, put down lamp, discard key',
    summary: 'DROP/PUT DOWN - Drop objects from your inventory. Example: DROP SWORD'
  }
};