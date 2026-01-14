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
    'not_visible': "{You} {can't} see {target}.",
    'not_reachable': "{You} {can't} reach {target}.",
    'too_heavy': "{target} is too heavy to pull (weighs {weight}kg).",
    'wearing_it': "{You} {can't} pull {target} while wearing it.",
    'wont_budge': "{target} won't budge.",

    // Success messages - levers/handles
    'lever_pulled': "{You} {pull} {target}.",
    'lever_clicks': "{You} {pull} {target} with a satisfying click.",
    'lever_toggled': "{You} {pull} {target}, switching it {newState}.",

    // Success messages - cords/ropes
    'cord_pulled': "{You} {pull} {target}.",
    'bell_rings': "{You} {pull} {target}. A bell rings somewhere!",
    'cord_activates': "{You} {give} {target} a firm tug.",

    // Success messages - attached objects
    'comes_loose': "{You} {pull} {target} and it comes loose!",
    'firmly_attached': "{You} {pull} {target}, but it's firmly attached.",
    'tugging_useless': "Tugging on {target} accomplishes nothing.",

    // Success messages - moveable objects
    'pulled_direction': "{You} {pull} {target} {direction}.",
    'pulled_nudged': "{You} {tug} at {target}, moving it slightly.",
    'pulled_with_effort': "With effort, {you} {drag} {target} {direction}.",

    // Success messages - fixed objects
    'pulling_does_nothing': "Pulling {target} has no effect.",
    'fixed_in_place': "{target} is fixed in place."
  },
  
  help: {
    description: 'Pull objects, levers, cords, or drag heavy items.',
    examples: 'pull lever, pull cord, drag chest south, tug rope, yank chain',
    summary: 'PULL/DRAG - Pull objects, levers, cords, or drag heavy items. Example: PULL LEVER'
  }
};
