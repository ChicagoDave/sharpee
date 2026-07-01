/**
 * Language content for NPC system (ADR-070)
 *
 * Attribution lines name the acting NPC via a `speaker` NounPhrase param (ADR-203)
 * and agree their verb with it via the ADR-199 Verb atom (`{verb:LEMMA speaker}`).
 * The article is the ADR-192 hint (`{the speaker}` here; author-overridable). The
 * `{capitalize …}` hint supplies the sentence-initial capital (top-level messages are
 * not sentence-initial by default, so auto-cap does not fire here).
 */

export const npcLanguage = {
  messages: {
    // Movement messages (visual renderings)
    'npc.enters': "{capitalize the speaker} {verb:enters speaker} from the {verbatim:direction}.",
    'npc.leaves': "{capitalize the speaker} {verb:leaves speaker} to the {verbatim:direction}.",
    'npc.arrives': "{capitalize the speaker} {verb:arrives speaker}.",
    'npc.departs': "{capitalize the speaker} {verb:departs speaker}.",

    // Movement messages (anonymized hearing renderings — heard in the dark/when blind)
    'npc.heard_arrives': "You hear someone enter.",
    'npc.heard_departs': "You hear someone leave.",

    // Observation messages
    'npc.notices_player': "{capitalize the speaker} {verb:notices speaker} you.",
    'npc.ignores_player': "{capitalize the speaker} {verb:ignores speaker} you.",

    // Action messages
    'npc.takes': "{capitalize the speaker} {verb:picks speaker} up {verbatim:itemName}.",
    'npc.drops': "{capitalize the speaker} {verb:drops speaker} {verbatim:itemName}.",
    'npc.follows': "{capitalize the speaker} {verb:follows speaker} you.",

    // Guard messages
    'npc.guard.blocks': "{capitalize the speaker} {verb:blocks speaker} your way!",
    'npc.guard.attacks': "{capitalize the speaker} {verb:attacks speaker} you!",
    'npc.guard.defeated': "{capitalize the speaker} {verb:is speaker} no longer a threat.",

    // Combat messages (basic)
    'npc.attacks': "{capitalize the speaker} {verb:attacks speaker} you!",
    'npc.misses': "{capitalize the speaker} {verb:swings speaker} at you but {verb:misses speaker}!",
    'npc.hits': "{capitalize the speaker} {verb:hits speaker} you for {damage} damage!",
    'npc.killed': "{capitalize the speaker} {verb:has speaker} been slain.",
    'npc.unconscious': "{capitalize the speaker} {verb:collapses speaker}, unconscious.",

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
    'npc.speaks': "{capitalize the speaker} {verb:says speaker}, \"{verbatim:text}\"",
    'npc.shouts': "{capitalize the speaker} {verb:shouts speaker}, \"{verbatim:text}\"",
    'npc.whispers': "{capitalize the speaker} {verb:whispers speaker}, \"{verbatim:text}\"",
    'npc.mutters': "{capitalize the speaker} {verb:mutters speaker}, \"{verbatim:text}\"",

    // Emote messages
    // `npc.emote` is the generic id emitted by NpcBehavior `emote` actions:
    // the behavior supplies the full sentence in `{verbatim:text}`, so render it verbatim.
    'npc.emote': "{verbatim:text}",
    'npc.laughs': "{capitalize the speaker} {verb:laughs speaker}.",
    'npc.growls': "{capitalize the speaker} {verb:growls speaker} menacingly.",
    'npc.cries': "{capitalize the speaker} {verb:cries speaker}.",
    'npc.sighs': "{capitalize the speaker} {verb:sighs speaker}.",

    // Dialogue messages
    'npc.greets': "{capitalize the speaker} {verb:greets speaker} you.",
    'npc.farewell': "{capitalize the speaker} {verb:bids speaker} you farewell.",
    'npc.no_response': "{capitalize the speaker} {verb:does speaker} not respond.",
    'npc.confused': "{capitalize the speaker} {verb:looks speaker} confused."
  }
};
