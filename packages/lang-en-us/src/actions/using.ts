/**
 * Language content for using action
 */

export const usingLanguage = {
  actionId: 'if.action.using',
  
  patterns: [
    'use [something]',
    'use [something] with [target]',
    'use [something] on [target]',
    'operate [something]',
    'employ [something]',
    'utilize [something]',
    'apply [something] to [target]'
  ],
  
  messages: {
    // Error messages
    'no_target': "Use what?",
    'not_visible': "You can't see {item}.",
    'not_reachable': "You can't reach {item}.",
    'target_not_visible': "You can't see {target}.",
    'target_not_reachable': "You can't reach {target}.",
    'nothing_to_use_with': "You need to specify what to use {item} with.",
    'cant_use_together': "You can't use {item} with {target}.",
    
    // Success messages - devices
    'device_used': "You use {item}.",
    'device_activated': "You activate {item}.",
    'device_toggled': "You toggle {item} {newState}.",
    
    // Success messages - tools
    'tool_used': "You use {item} on {target}.",
    'tool_applied': "You apply {item} to {target}.",
    'tool_modifies': "Using {item} modifies {target}.",
    'tool_fixes': "You fix {target} with {item}.",
    'tool_breaks': "You break {target} with {item}.",
    
    // Success messages - consumables
    'consumed': "You use {item}.",
    'potion_drunk': "You drink {item}.",
    'medicine_taken': "You take {item}.",
    'food_eaten': "You eat {item}.",
    
    // Success messages - keys
    'key_used': "You use {item} on {target}.",
    'unlocks': "You unlock {target} with {item}.",
    'already_unlocked': "{target} is already unlocked.",
    'wrong_key': "{item} doesn't fit {target}.",
    
    // Success messages - delegation
    'opens_item': "You open {item}.",
    'reads_item': "You read {item}.",
    
    // Generic messages
    'generic_use': "You use {item}.",
    'nothing_happens': "Nothing obvious happens.",
    'not_useful_here': "That doesn't seem useful here."
  },
  
  help: {
    description: 'Use objects in various ways, or use one object with another.',
    examples: 'use lamp, use key on door, use hammer with nail, apply bandage to wound',
    summary: 'USE/OPERATE - Use objects in various ways, or use one object with another. Example: USE KEY ON DOOR'
  }
};
