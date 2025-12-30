/**
 * Say Action Types
 *
 * Custom action for speech in Dungeo.
 * Handles various word puzzles:
 * - Cyclops puzzle (say "Odysseus")
 * - Loud Room echo puzzle (say "echo")
 * - Riddle Room puzzle (answer "well")
 */

export const SAY_ACTION_ID = 'dungeo.say';

export const SayMessages = {
  NOTHING_TO_SAY: 'dungeo.say.nothing',
  SAY_TO_AIR: 'dungeo.say.to_air',
  NPC_RESPONDS: 'dungeo.say.npc_responds',

  // Loud Room echo puzzle
  LOUD_ROOM_ECHO_DEATH: 'dungeo.loud_room.echo_death',
  LOUD_ROOM_ECHO_SAFE: 'dungeo.loud_room.echo_safe',
  LOUD_ROOM_ACOUSTICS: 'dungeo.loud_room.acoustics',

  // Riddle Room puzzle
  RIDDLE_CORRECT: 'dungeo.riddle.correct',
  RIDDLE_WRONG: 'dungeo.riddle.wrong',
  RIDDLE_ALREADY_SOLVED: 'dungeo.riddle.already_solved',
} as const;
