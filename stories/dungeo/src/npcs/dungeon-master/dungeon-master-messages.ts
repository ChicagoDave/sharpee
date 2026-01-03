/**
 * Message IDs for the Dungeon Master NPC
 *
 * Based on Dungeon FORTRAN messages 780-810
 */

export const DungeonMasterMessages = {
  // Dungeon Master appearance/description
  DESCRIPTION: 'dungeo.dm.description',
  APPEARS_AT_DOOR: 'dungeo.dm.appears_at_door',

  // Trivia questions (780-787 in FORTRAN)
  QUESTION_0: 'dungeo.dm.question_0', // Room to enter thief's lair
  QUESTION_1: 'dungeo.dm.question_1', // Where from altar
  QUESTION_2: 'dungeo.dm.question_2', // Zorkmid treasure value
  QUESTION_3: 'dungeo.dm.question_3', // How to read cakes
  QUESTION_4: 'dungeo.dm.question_4', // What to do with mirror
  QUESTION_5: 'dungeo.dm.question_5', // What offends ghosts
  QUESTION_6: 'dungeo.dm.question_6', // What item is haunted
  QUESTION_7: 'dungeo.dm.question_7', // Is hello sailor useful

  // Trivia responses
  CORRECT_ANSWER: 'dungeo.dm.correct_answer',
  WRONG_ANSWER_1: 'dungeo.dm.wrong_answer_1', // First wrong
  WRONG_ANSWER_2: 'dungeo.dm.wrong_answer_2', // Second wrong
  WRONG_ANSWER_3: 'dungeo.dm.wrong_answer_3', // Third wrong
  WRONG_ANSWER_4: 'dungeo.dm.wrong_answer_4', // Fourth wrong (last chance)
  WRONG_ANSWER_5: 'dungeo.dm.wrong_answer_5', // Fifth wrong (failure)

  // Completion states
  TRIVIA_PASSED: 'dungeo.dm.trivia_passed',
  TRIVIA_FAILED: 'dungeo.dm.trivia_failed',
  DOOR_OPENS: 'dungeo.dm.door_opens',

  // Other interactions
  NO_ANSWER_YET: 'dungeo.dm.no_answer_yet', // Knock when not ready
  ALREADY_PASSED: 'dungeo.dm.already_passed',
  FOLLOWING: 'dungeo.dm.following',
  STAYING: 'dungeo.dm.staying',

  // Parapet cooperation
  SETS_DIAL: 'dungeo.dm.sets_dial',
  PUSHES_BUTTON: 'dungeo.dm.pushes_button',
  CANNOT_DO_THAT: 'dungeo.dm.cannot_do_that'
} as const;

export type DungeonMasterMessageId = typeof DungeonMasterMessages[keyof typeof DungeonMasterMessages];
