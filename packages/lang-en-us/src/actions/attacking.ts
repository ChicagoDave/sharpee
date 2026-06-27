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
    'not_visible': "{You} {can't} see {the target}.",
    'not_reachable': "{You} {can't} reach {the target}.",
    'self': "Violence against {yourself} isn't the answer.",
    'not_holding_weapon': "{You} aren't holding {the weapon}.",
    'indestructible': "{capitalize the target} {verb:is target} far too solid to damage.",
    'need_weapon_to_damage': "{capitalize the target} requires a weapon to damage.",
    'wrong_weapon_type': "{capitalize the target} can't be damaged with that type of weapon.",
    'attack_ineffective': "{Your} attack has no effect on {the target}.",

    // Combat validation errors
    'already_dead': "{capitalize the target} {verb:is target} already dead.",
    'violence_not_the_answer': "Violence is not the answer.",
    // ADR-158: combat.* templates use the formatter chain via the
    // {target} EntityInfo param; CombatService and the attacking action
    // also pass {targetName} (bare string) on the same params block for
    // handler / event-sourcing consumption.
    'combat.cannot_attack': "{You} {can't} attack {the target}.",
    'combat.already_dead': "{capitalize the target} {verb:is target} already dead.",
    'combat.not_hostile': "{capitalize the target} isn't hostile.",
    'combat.no_target': "Attack what?",
    'combat.target_unconscious': "{capitalize the target} {verb:is target} already unconscious.",
    'combat.need_weapon': "{You} {need} a weapon to attack effectively.",

    // Combat attack outcomes (ADR-072 CombatService)
    'combat.attack.missed': "{You} {swing} at {the target} but miss!",
    'combat.attack.hit': "{You} {hit} {the target} for {damage} damage.",
    'combat.attack.hit_light': "{You} {graze} {the target}, doing {damage} damage.",
    'combat.attack.hit_heavy': "{You} {land} a solid blow on {the target}, dealing {damage} damage!",
    'combat.attack.knocked_out': "{capitalize the target} collapses, unconscious!",
    'combat.attack.killed': "{You} {have} slain {the target}!",

    // Combat defense outcomes (ADR-072 CombatService)
    'combat.defend.blocked': "{capitalize the target} blocks {your} attack!",
    'combat.defend.parried': "{capitalize the target} parries {your} attack!",
    'combat.defend.dodged': "{capitalize the target} dodges out of the way!",

    // Health status descriptions (ADR-072 CombatService)
    'combat.health.healthy': "{capitalize the target} appears uninjured.",
    'combat.health.wounded': "{capitalize the target} {verb:has target} been wounded.",
    'combat.health.badly_wounded': "{capitalize the target} {verb:is target} badly wounded.",
    'combat.health.near_death': "{capitalize the target} {verb:is target} barely clinging to life!",
    'combat.health.unconscious': "{capitalize the target} lies unconscious.",
    'combat.health.dead': "{capitalize the target} {verb:is target} dead.",

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
    'attacked': "{You} {attack} {the target}.",
    'attacked_with': "{You} {attack} {the target} with {the weapon}.",
    'hit_target': "{You} {hit} {the target}.",
    'hit_blindly': "{You} {swing} wildly, hitting nothing.",
    'hit_with': "{You} {hit} {the target} with {the weapon}.",
    'struck': "{You} {strike} {the target}!",
    'struck_with': "{You} {strike} {the target} with {the weapon}!",

    // Success messages - unarmed
    'punched': "{You} {punch} {the target}.",
    'kicked': "{You} {kick} {the target}.",
    'unarmed_attack': "{You} {attack} {the target} with {your} bare hands.",

    // Success messages - breaking/destroying
    'target_broke': "{capitalize the target} breaks!",
    'target_shattered': "{capitalize the target} shatters into pieces!",
    'broke': "{You} {break} {the target}!",
    'smashed': "{You} {smash} {the target} to pieces!",
    'target_destroyed': "{capitalize the target} {verb:is target} utterly destroyed!",
    'destroyed': "{You} {destroy} {the target}!",
    'shattered': "{capitalize the target} shatters!",
    'target_damaged': "{capitalize the target} shows signs of damage. ({damage} damage dealt)",

    // Success messages - killing
    'killed_target': "{You} {have} defeated {the target}!",
    'killed_blindly': "Something dies in the darkness.",

    // Environmental results
    'items_spilled': "{capitalize the target}'s possessions spill onto the ground.",
    'passage_revealed': "A hidden passage is revealed!",
    'debris_created': "Debris from {the target} litters the area.",

    // Target reactions - actors
    'defends': "{capitalize the target} defends against {your} attack.",
    'dodges': "{capitalize the target} dodges {your} attack.",
    'retaliates': "{capitalize the target} fights back!",
    'flees': "{capitalize the target} flees from {you}!",

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
