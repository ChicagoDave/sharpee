/**
 * Language content for NPC system (ADR-070)
 */

export const npcLanguage = {
  messages: {
    // Movement messages (visual renderings)
    'npc.enters': "{verbatim:npcName} enters from the {verbatim:direction}.",
    'npc.leaves': "{verbatim:npcName} leaves to the {verbatim:direction}.",
    'npc.arrives': "{verbatim:npcName} arrives.",
    'npc.departs': "{verbatim:npcName} departs.",

    // Movement messages (anonymized hearing renderings — heard in the dark/when blind)
    'npc.heard_arrives': "You hear someone enter.",
    'npc.heard_departs': "You hear someone leave.",

    // Observation messages
    'npc.notices_player': "{verbatim:npcName} notices you.",
    'npc.ignores_player': "{verbatim:npcName} ignores you.",

    // Action messages
    'npc.takes': "{verbatim:npcName} picks up {verbatim:itemName}.",
    'npc.drops': "{verbatim:npcName} drops {verbatim:itemName}.",
    'npc.follows': "{verbatim:npcName} follows you.",

    // Guard messages
    'npc.guard.blocks': "{verbatim:npcName} blocks your way!",
    'npc.guard.attacks': "{verbatim:npcName} attacks you!",
    'npc.guard.defeated': "{verbatim:npcName} is no longer a threat.",

    // Combat messages (basic)
    'npc.attacks': "{verbatim:npcName} attacks you!",
    'npc.misses': "{verbatim:npcName} swings at you but misses!",
    'npc.hits': "{verbatim:npcName} hits you for {damage} damage!",
    'npc.killed': "{verbatim:npcName} has been slain.",
    'npc.unconscious': "{verbatim:npcName} collapses, unconscious.",

    // NPC combat attack outcomes (canonical Zork troll messages from MDL source)
    'npc.combat.attack.missed': "The troll swings his axe, but it misses.",
    'npc.combat.attack.hit': "The axe gets you right in the side. Ouch!",
    'npc.combat.attack.hit_light': "The flat of the troll's axe skins across your forearm.",
    'npc.combat.attack.hit_heavy': "The troll hits you with a glancing blow, and you are momentarily stunned.",
    'npc.combat.attack.knocked_out': "The flat of the troll's axe hits you delicately on the head, knocking you out.",
    'npc.combat.attack.killed': "The troll lands a killing blow. You are dead.",

    // Speech messages
    // `npc.speech` is the generic id emitted by NpcBehavior `speak` actions:
    // the behavior supplies the full line in `{verbatim:text}`, so render it verbatim.
    'npc.speech': "{verbatim:text}",
    'npc.speaks': "{verbatim:npcName} says, \"{verbatim:text}\"",
    'npc.shouts': "{verbatim:npcName} shouts, \"{verbatim:text}\"",
    'npc.whispers': "{verbatim:npcName} whispers, \"{verbatim:text}\"",
    'npc.mutters': "{verbatim:npcName} mutters, \"{verbatim:text}\"",

    // Emote messages
    // `npc.emote` is the generic id emitted by NpcBehavior `emote` actions:
    // the behavior supplies the full sentence in `{verbatim:text}`, so render it verbatim.
    'npc.emote': "{verbatim:text}",
    'npc.laughs': "{verbatim:npcName} laughs.",
    'npc.growls': "{verbatim:npcName} growls menacingly.",
    'npc.cries': "{verbatim:npcName} cries.",
    'npc.sighs': "{verbatim:npcName} sighs.",

    // Dialogue messages
    'npc.greets': "{verbatim:npcName} greets you.",
    'npc.farewell': "{verbatim:npcName} bids you farewell.",
    'npc.no_response': "{verbatim:npcName} doesn't respond.",
    'npc.confused': "{verbatim:npcName} looks confused."
  }
};
