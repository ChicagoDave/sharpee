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
    'not_visible': "{You} {can't} see {the target}.",
    'not_reachable': "{You} {can't} reach {the target}.",
    'too_heavy': "{capitalize the target} {verb:is target} far too heavy to push (weighs {weight}kg).",
    'wearing_it': "{You} {can't} push {the target} while wearing it.",
    'carrying_it': "{You} {can't} push {the target} while carrying it.",
    // ADR-378 D6: the way does not admit a pushed thing (or the target is
    // not in the room, or the thing cannot go that way at all).
    'cannot_push_that_way': "{You} {can't} push {the target} that way.",

    // Success messages - buttons/switches
    'button_pushed': "{You} {push} {the target}.",
    'button_clicks': "{You} {press} {the target}. Click!",
    'switch_toggled': "{You} {push} {the target}, toggling it {newState}.",

    // Success messages - a push between rooms (ADR-378 D6); going's
    // arrival narration follows this line.
    'pushed_direction': "{You} {push} {the target} {verbatim:direction}.",
    'pushed_nudged': "{You} {give} {the target} a push, but it doesn't move far.",

    // Success messages - fixed objects
    'wont_budge': "{capitalize the target} won't budge.",
    'pushing_does_nothing': "Pushing {the target} has no effect.",
    'fixed_in_place': "{capitalize the target} {verb:is target} fixed in place."
  },
  
  help: {
    description: 'Push objects, press buttons, or move heavy items.',
    examples: 'push button, push boulder north, press switch, shove crate',
    summary: 'PUSH/PRESS - Push objects, press buttons, or move heavy items. Example: PUSH BUTTON'
  }
};
