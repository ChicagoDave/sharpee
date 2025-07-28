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
    'not_held': "You aren't holding {item}.",
    'dropped': "Dropped.",
    'dropped_in': "You put {item} in {container}.",
    'dropped_on': "You put {item} on {surface}."
  },
  
  help: {
    description: 'Drop objects from your inventory.',
    examples: 'drop book, put down lamp, discard key',
    summary: 'DROP/PUT DOWN - Drop objects from your inventory. Example: DROP SWORD'
  }
};