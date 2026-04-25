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
    'not_visible': "{You} {can't} see {the:target}.",
    'not_reachable': "{You} {can't} reach {the:target}.",
    'too_heavy': "{the:cap:target} is far too heavy to push (weighs {weight}kg).",
    'wearing_it': "{You} {can't} push {the:target} while wearing it.",

    // Success messages - buttons/switches
    'button_pushed': "{You} {push} {the:target}.",
    'button_clicks': "{You} {press} {the:target}. Click!",
    'switch_toggled': "{You} {push} {the:target}, toggling it {newState}.",

    // Success messages - moveable objects
    'pushed_direction': "{You} {push} {the:target} {direction}.",
    'pushed_nudged': "{You} {give} {the:target} a push, but it doesn't move far.",
    'pushed_with_effort': "With considerable effort, {you} {push} {the:target} {direction}.",
    'reveals_passage': "As {you} {push} {the:target} {direction}, it slides aside, revealing a hidden passage!",

    // Success messages - fixed objects
    'wont_budge': "{the:cap:target} won't budge.",
    'pushing_does_nothing': "Pushing {the:target} has no effect.",
    'fixed_in_place': "{the:cap:target} is fixed in place."
  },
  
  help: {
    description: 'Push objects, press buttons, or move heavy items.',
    examples: 'push button, push boulder north, press switch, shove crate',
    summary: 'PUSH/PRESS - Push objects, press buttons, or move heavy items. Example: PUSH BUTTON'
  }
};
