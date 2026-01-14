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
    'not_visible': "{You} {can't} see {target}.",
    'not_reachable': "{You} {can't} reach {target}.",
    'self': "Violence against {yourself} isn't the answer.",
    'not_holding_weapon': "{You} aren't holding {weapon}.",
    'indestructible': "{target} is far too solid to damage.",
    'need_weapon_to_damage': "{target} requires a weapon to damage.",
    'wrong_weapon_type': "{target} can't be damaged with that type of weapon.",
    'attack_ineffective': "{Your} attack has no effect on {target}.",

    // Combat validation errors (ADR-072 CombatService)
    'combat.cannot_attack': "{You} {can't} attack {targetName}.",
    'combat.already_dead': "{targetName} is already dead.",
    'combat.not_hostile': "{targetName} isn't hostile.",
    'combat.no_target': "Attack what?",
    'combat.target_unconscious': "{targetName} is already unconscious.",
    'combat.need_weapon': "{You} {need} a weapon to attack effectively.",

    // Combat attack outcomes (ADR-072 CombatService)
    'combat.attack.missed': "{You} {swing} at {targetName} but miss!",
    'combat.attack.hit': "{You} {hit} {targetName} for {damage} damage.",
    'combat.attack.hit_light': "{You} {graze} {targetName}, doing {damage} damage.",
    'combat.attack.hit_heavy': "{You} {land} a solid blow on {targetName}, dealing {damage} damage!",
    'combat.attack.knocked_out': "{targetName} collapses, unconscious!",
    'combat.attack.killed': "{You} {have} slain {targetName}!",

    // Combat defense outcomes (ADR-072 CombatService)
    'combat.defend.blocked': "{targetName} blocks {your} attack!",
    'combat.defend.parried': "{targetName} parries {your} attack!",
    'combat.defend.dodged': "{targetName} dodges out of the way!",

    // Health status descriptions (ADR-072 CombatService)
    'combat.health.healthy': "{targetName} appears uninjured.",
    'combat.health.wounded': "{targetName} has been wounded.",
    'combat.health.badly_wounded': "{targetName} is badly wounded.",
    'combat.health.near_death': "{targetName} is barely clinging to life!",
    'combat.health.unconscious': "{targetName} lies unconscious.",
    'combat.health.dead': "{targetName} is dead.",

    // Special weapon effects (ADR-072 CombatService)
    'combat.special.sword_glows': "{Your} sword glows brightly!",
    'combat.special.sword_stops_glowing': "{Your} sword's glow fades.",
    'combat.special.blessed_weapon': "{Your} blessed weapon burns the undead!",

    // Combat state (ADR-072 CombatService)
    'combat.started': "Combat has begun!",
    'combat.ended': "The battle is over.",
    'combat.player_died': "{You} {have} been slain!",
    'combat.player_resurrected': "{You} {feel} life return to {your} body.",

    // Success messages - combat
    'attacked': "{You} {attack} {target}.",
    'attacked_with': "{You} {attack} {target} with {weapon}.",
    'hit_target': "{You} {hit} {target}.",
    'hit_blindly': "{You} {swing} wildly, hitting nothing.",
    'hit_with': "{You} {hit} {target} with {weapon}.",
    'struck': "{You} {strike} {target}!",
    'struck_with': "{You} {strike} {target} with {weapon}!",

    // Success messages - unarmed
    'punched': "{You} {punch} {target}.",
    'kicked': "{You} {kick} {target}.",
    'unarmed_attack': "{You} {attack} {target} with {your} bare hands.",

    // Success messages - breaking/destroying
    'target_broke': "{target} breaks!",
    'target_shattered': "{target} shatters into pieces!",
    'broke': "{You} {break} {target}!",
    'smashed': "{You} {smash} {target} to pieces!",
    'target_destroyed': "{target} is utterly destroyed!",
    'destroyed': "{You} {destroy} {target}!",
    'shattered': "{target} shatters!",
    'target_damaged': "{target} shows signs of damage. ({damage} damage dealt)",

    // Success messages - killing
    'killed_target': "{You} {have} defeated {target}!",
    'killed_blindly': "Something dies in the darkness.",

    // Environmental results
    'items_spilled': "{target}'s possessions spill onto the ground.",
    'passage_revealed': "A hidden passage is revealed!",
    'debris_created': "Debris from {target} litters the area.",

    // Target reactions - actors
    'defends': "{target} defends against {your} attack.",
    'dodges': "{target} dodges {your} attack.",
    'retaliates': "{target} fights back!",
    'flees': "{target} flees from {you}!",

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
