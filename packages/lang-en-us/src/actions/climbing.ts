/**
 * English language content for the climbing action
 */

export const climbingLanguage = {
  actionId: 'if.action.climbing',
  
  patterns: [
    'climb',
    'climb [something]',
    'climb up',
    'climb down',
    'climb up [something]',
    'climb down [something]',
    'climb on [something]',
    'climb onto [something]',
    'climb over [something]',
    'scale [something]',
    'ascend',
    'ascend [something]',
    'descend',
    'descend [something]',
    'scramble up [something]',
    'clamber up [something]',
    'shin up [something]'
  ],
  
  messages: {
    'no_target': "What do you want to climb?",
    'not_climbable': "You can't climb {object}.",
    'cant_go_that_way': "You can't climb {direction} from here.",
    'climbed_up': "You climb up.",
    'climbed_down': "You climb down.",
    'climbed_onto': "You climb onto {object}.",
    'already_there': "You're already on {place}.",
    'too_high': "That's too high to climb.",
    'too_dangerous': "That looks too dangerous to climb.",
    'need_equipment': "You'd need climbing equipment for that.",
    'too_slippery': "It's too slippery to climb.",
    'nothing_to_climb': "There's nothing to climb here."
  },
  
  help: {
    description: 'Climb objects or move in vertical directions.',
    examples: 'climb tree, climb up, climb down, climb ladder',
    summary: 'CLIMB - Climb objects or move in vertical directions. Example: CLIMB LADDER'
  }
};