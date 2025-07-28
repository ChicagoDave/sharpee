/**
 * Language content for throwing action
 */

export const throwingLanguage = {
  actionId: 'if.action.throwing',
  
  patterns: [
    'throw [something]',
    'throw [something] at [target]',
    'throw [something] to [target]',
    'throw [something] [direction]',
    'hurl [something]',
    'hurl [something] at [target]',
    'toss [something]',
    'toss [something] to [target]',
    'chuck [something]',
    'fling [something]',
    'lob [something]'
  ],
  
  messages: {
    // Error messages
    'no_item': "Throw what?",
    'not_holding': "You aren't holding {item}.",
    'target_not_visible': "You can't see {target}.",
    'target_not_here': "{target} isn't here.",
    'no_exit': "There's no exit {direction}.",
    'too_heavy': "{item} is too heavy to throw far (weighs {weight}kg).",
    'self': "You can't throw things at yourself.",
    
    // Success messages - general throw
    'thrown': "You throw {item}.",
    'thrown_down': "You toss {item} to the ground.",
    'thrown_gently': "You gently toss {item}.",
    
    // Success messages - at target
    'thrown_at': "You throw {item} at {target}.",
    'hits_target': "You throw {item} at {target}. It hits!",
    'misses_target': "You throw {item} at {target}, but miss.",
    'bounces_off': "{item} bounces off {target}.",
    'lands_on': "{item} lands on {target}.",
    'lands_in': "{item} lands in {target}.",
    
    // Success messages - directional
    'thrown_direction': "You throw {item} {direction}.",
    'sails_through': "{item} sails through the exit to the {direction}.",
    
    // Breaking messages
    'breaks_on_impact': "{item} shatters on impact!",
    'breaks_against': "{item} smashes against {target}!",
    'fragile_breaks': "The fragile {item} breaks into pieces.",
    
    // Target reactions
    'target_ducks': "{target} ducks out of the way.",
    'target_catches': "{target} catches {item}!",
    'target_angry': "{target} doesn't appreciate being hit with {item}."
  },
  
  help: {
    description: 'Throw objects at targets, in directions, or just drop them forcefully.',
    examples: 'throw ball at window, throw rock north, toss coin to beggar, hurl spear at target',
    summary: 'THROW AT - Throw objects at targets, in directions, or just drop them forcefully. Example: THROW ROCK AT WINDOW'
  }
};
