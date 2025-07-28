/**
 * English language content for the closing action
 */

export const closingLanguage = {
  actionId: 'if.action.closing',
  
  patterns: [
    'close [something]',
    'shut [something]'
  ],
  
  messages: {
    'no_target': "Close what?",
    'not_closable': "{item} can't be closed.",
    'already_closed': "{item} is already closed.",
    'closed': "You close {item}.",
    'cant_reach': "You can't reach {item}.",
    'prevents_closing': "You can't close {item} while {obstacle} is in the way."
  },
  
  help: {
    description: 'Close containers or doors.',
    examples: 'close door, shut box',
    summary: 'CLOSE/SHUT - Close doors, containers, and other closeable objects. Example: CLOSE DOOR'
  }
};