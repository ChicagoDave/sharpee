/**
 * Language content for pulling action
 */

export const pullingLanguage = {
  actionId: 'if.action.pulling',
  
  patterns: [
    'pull [something]',
    'pull [something] [direction]',
    'tug [something]',
    'tug on [something]',
    'drag [something]',
    'drag [something] [direction]',
    'yank [something]',
    'draw [something]'
  ],
  
  messages: {
    // Error messages
    'no_target': "Pull what?",
    'not_visible': "{You} {can't} see {the:target}.",
    'not_reachable': "{You} {can't} reach {the:target}.",
    'too_heavy': "{the:cap:target} is too heavy to pull (weighs {weight}kg).",
    'wearing_it': "{You} {can't} pull {the:target} while wearing it.",
    'wont_budge': "{the:cap:target} won't budge.",

    // Success messages - levers/handles
    'lever_pulled': "{You} {pull} {the:target}.",
    'lever_clicks': "{You} {pull} {the:target} with a satisfying click.",
    'lever_toggled': "{You} {pull} {the:target}, switching it {newState}.",

    // Success messages - cords/ropes
    'cord_pulled': "{You} {pull} {the:target}.",
    'bell_rings': "{You} {pull} {the:target}. A bell rings somewhere!",
    'cord_activates': "{You} {give} {the:target} a firm tug.",

    // Success messages - attached objects
    'comes_loose': "{You} {pull} {the:target} and it comes loose!",
    'firmly_attached': "{You} {pull} {the:target}, but it's firmly attached.",
    'tugging_useless': "Tugging on {the:target} accomplishes nothing.",

    // Success messages - moveable objects
    'pulled_direction': "{You} {pull} {the:target} {direction}.",
    'pulled_nudged': "{You} {tug} at {the:target}, moving it slightly.",
    'pulled_with_effort': "With effort, {you} {drag} {the:target} {direction}.",

    // Success messages - fixed objects
    'pulling_does_nothing': "Pulling {the:target} has no effect.",
    'fixed_in_place': "{the:cap:target} is fixed in place."
  },
  
  help: {
    description: 'Pull objects, levers, cords, or drag heavy items.',
    examples: 'pull lever, pull cord, drag chest south, tug rope, yank chain',
    summary: 'PULL/DRAG - Pull objects, levers, cords, or drag heavy items. Example: PULL LEVER'
  }
};
