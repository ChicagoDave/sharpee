/**
 * Language content for pushing action
 */

export const pushingLanguage = {
  actionId: 'if.action.pushing',
  
  patterns: [
    'push [something]',
    'push [something] [direction]',
    'press [something]',
    'shove [something]',
    'shove [something] [direction]',
    'move [something]',
    'move [something] [direction]'
  ],
  
  messages: {
    // Error messages
    'no_target': "Push what?",
    'not_visible': "You can't see {target}.",
    'not_reachable': "You can't reach {target}.",
    'too_heavy': "{target} is far too heavy to push (weighs {weight}kg).",
    'wearing_it': "You can't push {target} while wearing it.",
    
    // Success messages - buttons/switches
    'button_pushed': "You push {target}.",
    'button_clicks': "You press {target}. Click!",
    'switch_toggled': "You push {target}, toggling it {newState}.",
    
    // Success messages - moveable objects
    'pushed_direction': "You push {target} {direction}.",
    'pushed_nudged': "You give {target} a push, but it doesn't move far.",
    'pushed_with_effort': "With considerable effort, you push {target} {direction}.",
    'reveals_passage': "As you push {target} {direction}, it slides aside, revealing a hidden passage!",
    
    // Success messages - fixed objects
    'wont_budge': "{target} won't budge.",
    'pushing_does_nothing': "Pushing {target} has no effect.",
    'fixed_in_place': "{target} is fixed in place."
  },
  
  help: {
    description: 'Push objects, press buttons, or move heavy items.',
    examples: 'push button, push boulder north, press switch, shove crate',
    summary: 'PUSH/PRESS - Push objects, press buttons, or move heavy items. Example: PUSH BUTTON'
  }
};
