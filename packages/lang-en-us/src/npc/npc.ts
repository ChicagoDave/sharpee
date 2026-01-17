/**
 * Language content for NPC system (ADR-070)
 */

export const npcLanguage = {
  messages: {
    // Movement messages
    'npc.enters': "{npcName} enters from the {direction}.",
    'npc.leaves': "{npcName} leaves to the {direction}.",
    'npc.arrives': "{npcName} arrives.",
    'npc.departs': "{npcName} departs.",

    // Observation messages
    'npc.notices_player': "{npcName} notices you.",
    'npc.ignores_player': "{npcName} ignores you.",

    // Action messages
    'npc.takes': "{npcName} picks up {itemName}.",
    'npc.drops': "{npcName} drops {itemName}.",
    'npc.follows': "{npcName} follows you.",

    // Guard messages
    'npc.guard.blocks': "{npcName} blocks your way!",
    'npc.guard.attacks': "{npcName} attacks you!",
    'npc.guard.defeated': "{npcName} is no longer a threat.",

    // Combat messages (basic)
    'npc.attacks': "{npcName} attacks you!",
    'npc.misses': "{npcName} swings at you but misses!",
    'npc.hits': "{npcName} hits you for {damage} damage!",
    'npc.killed': "{npcName} has been slain.",
    'npc.unconscious': "{npcName} collapses, unconscious.",

    // NPC combat attack outcomes (canonical Zork troll messages from MDL source)
    'npc.combat.attack.missed': "The troll swings his axe, but it misses.",
    'npc.combat.attack.hit': "The axe gets you right in the side. Ouch!",
    'npc.combat.attack.hit_light': "The flat of the troll's axe skins across your forearm.",
    'npc.combat.attack.hit_heavy': "The troll hits you with a glancing blow, and you are momentarily stunned.",
    'npc.combat.attack.knocked_out': "The flat of the troll's axe hits you delicately on the head, knocking you out.",
    'npc.combat.attack.killed': "The troll lands a killing blow. You are dead.",

    // Speech messages
    'npc.speaks': "{npcName} says, \"{text}\"",
    'npc.shouts': "{npcName} shouts, \"{text}\"",
    'npc.whispers': "{npcName} whispers, \"{text}\"",
    'npc.mutters': "{npcName} mutters, \"{text}\"",

    // Emote messages
    'npc.laughs': "{npcName} laughs.",
    'npc.growls': "{npcName} growls menacingly.",
    'npc.cries': "{npcName} cries.",
    'npc.sighs': "{npcName} sighs.",

    // Dialogue messages
    'npc.greets': "{npcName} greets you.",
    'npc.farewell': "{npcName} bids you farewell.",
    'npc.no_response': "{npcName} doesn't respond.",
    'npc.confused': "{npcName} looks confused."
  }
};
