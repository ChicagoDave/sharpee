/**
 * Say Action Types
 *
 * Custom action for speech in Dungeo.
 * Primarily used for the Cyclops puzzle (say "Odysseus").
 */

export const SAY_ACTION_ID = 'dungeo.say';

export const SayMessages = {
  NOTHING_TO_SAY: 'dungeo.say.nothing',
  SAY_TO_AIR: 'dungeo.say.to_air',
  NPC_RESPONDS: 'dungeo.say.npc_responds',
} as const;
