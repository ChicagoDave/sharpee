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
    'not_closable': "{the:cap:item} can't be closed.",
    'already_closed': "{the:cap:item} is already closed.",
    'closed': "{You} {close} {the:item}.",
    'cant_reach': "{You} {can't} reach {the:item}.",
    'prevents_closing': "{You} {can't} close {the:item} while {obstacle} is in the way."
  },
  
  help: {
    description: 'Close containers or doors.',
    examples: 'close door, shut box',
    summary: 'CLOSE/SHUT - Close doors, containers, and other closeable objects. Example: CLOSE DOOR'
  }
};