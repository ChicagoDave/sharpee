/**
 * Language content for attacking action
 */

export const attackingLanguage = {
  actionId: 'if.action.attacking',
  
  patterns: [
    'attack [something]',
    'attack [something] with [weapon]',
    'hit [something]',
    'hit [something] with [weapon]',
    'strike [something]',
    'strike [something] with [weapon]',
    'fight [something]',
    'kill [something]',
    'break [something]',
    'destroy [something]',
    'smash [something]'
  ],
  
  messages: {
    // Error messages
    'no_target': "Attack what?",
    'not_visible': "You can't see {target}.",
    'not_reachable': "You can't reach {target}.",
    'self': "Violence against yourself isn't the answer.",
    'not_holding_weapon': "You aren't holding {weapon}.",
    'indestructible': "{target} is far too solid to damage.",
    
    // Success messages - combat
    'attacked': "You attack {target}.",
    'attacked_with': "You attack {target} with {weapon}.",
    'hit': "You hit {target}.",
    'hit_with': "You hit {target} with {weapon}.",
    'struck': "You strike {target}!",
    'struck_with': "You strike {target} with {weapon}!",
    
    // Success messages - unarmed
    'punched': "You punch {target}.",
    'kicked': "You kick {target}.",
    'unarmed_attack': "You attack {target} with your bare hands.",
    
    // Success messages - breaking
    'broke': "You break {target}!",
    'smashed': "You smash {target} to pieces!",
    'destroyed': "You destroy {target}!",
    'shattered': "{target} shatters!",
    
    // Target reactions - actors
    'defends': "{target} defends against your attack.",
    'dodges': "{target} dodges your attack.",
    'retaliates': "{target} fights back!",
    'flees': "{target} flees from you!",
    
    // Violence discouragement
    'peaceful_solution': "Violence isn't necessary here.",
    'no_fighting': "Fighting won't solve this problem.",
    'unnecessary_violence': "That seems unnecessarily violent."
  },
  
  help: {
    description: 'Attack creatures or attempt to break objects.',
    examples: 'attack troll, hit goblin with sword, break window, smash vase',
    summary: 'ATTACK/HIT/FIGHT - Attack creatures or attempt to break objects. Example: ATTACK TROLL'
  }
};
