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
    'not_holding': "{You} aren't holding {the:item}.",
    'target_not_visible': "{You} {can't} see {the:target}.",
    'target_not_here': "{the:cap:target} isn't here.",
    'no_exit': "There's no exit {direction}.",
    'too_heavy': "{the:cap:item} is too heavy to throw far (weighs {weight}kg).",
    'self': "{You} {can't} throw things at {yourself}.",

    // Success messages - general throw
    'thrown': "{You} {throw} {the:item}.",
    'thrown_down': "{You} {toss} {the:item} to the ground.",
    'thrown_gently': "{You} gently {toss} {the:item}.",

    // Success messages - at target
    'thrown_at': "{You} {throw} {the:item} at {the:target}.",
    'hits_target': "{You} {throw} {the:item} at {the:target}. It hits!",
    'misses_target': "{You} {throw} {the:item} at {the:target}, but miss.",
    'bounces_off': "{the:cap:item} bounces off {the:target}.",
    'lands_on': "{the:cap:item} lands on {the:target}.",
    'lands_in': "{the:cap:item} lands in {the:target}.",

    // Success messages - directional
    'thrown_direction': "{You} {throw} {the:item} {direction}.",
    'sails_through': "{the:cap:item} sails through the exit to the {direction}.",

    // Breaking messages
    'breaks_on_impact': "{the:cap:item} shatters on impact!",
    'breaks_against': "{the:cap:item} smashes against {the:target}!",
    // ADR-158 exception: hand-written "The fragile" prefix wraps an
    // adjective phrase around the entity, which the {the:cap:…} formatter
    // cannot reproduce. Renders correctly for common nouns; the proper-name
    // edge case ("The fragile Excalibur") is rare in practice.
    'fragile_breaks': "The fragile {item} breaks into pieces.",

    // Target reactions
    'target_ducks': "{the:cap:target} ducks out of the way.",
    'target_catches': "{the:cap:target} catches {the:item}!",
    'target_angry': "{the:cap:target} doesn't appreciate being hit with {the:item}."
  },
  
  help: {
    description: 'Throw objects at targets, in directions, or just drop them forcefully.',
    examples: 'throw ball at window, throw rock north, toss coin to beggar, hurl spear at target',
    summary: 'THROW AT - Throw objects at targets, in directions, or just drop them forcefully. Example: THROW ROCK AT WINDOW'
  }
};
