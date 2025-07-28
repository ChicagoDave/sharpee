/**
 * English language content for the taking off action (removing clothing)
 */

export const takingOffLanguage = {
  actionId: 'if.action.taking_off',
  
  patterns: [
    'take off [something]',
    'take [something] off',
    'remove [something]',
    'doff [something]'
  ],
  
  messages: {
    'no_target': "Take off what?",
    'not_wearing': "You aren't wearing {item}.",
    'removed': "You take off {item}.",
    'cant_remove': "You can't take off {item}.",
    'prevents_removal': "You'll need to take off {blocking} first."
  },
  
  help: {
    description: 'Remove worn clothing or accessories.',
    examples: 'take off hat, remove coat, doff gloves, take ring off',
    summary: 'TAKE OFF/REMOVE - Remove worn clothing or accessories. Example: TAKE OFF COAT'
  }
};