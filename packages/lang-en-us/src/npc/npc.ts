/**
 * Language content for the standard NPC behaviors (ADR-070; ADR-328 D5)
 *
 * Only what a behavior NARRATES lives here — a guard's blocking line, a
 * wanderer noticing the player, a follower following. What an NPC DOES
 * (take, go, attack) renders through the action's own messages in the
 * actor's voice (ADR-328 D4); no third-person "npc.takes" dialect exists.
 *
 * Attribution lines name the acting NPC via a `speaker` NounPhrase param (ADR-203)
 * and agree their verb with it via the ADR-199 Verb atom (`{verb:LEMMA speaker}`).
 * The article is the ADR-192 hint (`{the speaker}` here; author-overridable). The
 * `{capitalize …}` hint supplies the sentence-initial capital (top-level messages are
 * not sentence-initial by default, so auto-cap does not fire here).
 */

export const npcLanguage = {
  messages: {
    // Observation messages
    'npc.notices_player': "{capitalize the speaker} {verb:notices speaker} you.",

    // Follower
    'npc.follows': "{capitalize the speaker} {verb:follows speaker} you.",

    // Guard
    'npc.guard.blocks': "{capitalize the speaker} {verb:blocks speaker} your way!"
  }
};
