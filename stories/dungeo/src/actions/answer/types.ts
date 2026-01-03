/**
 * Answer Action Types
 */

export const ANSWER_ACTION_ID = 'dungeo.answer';

export const AnswerMessages = {
  NO_QUESTION: 'dungeo.answer.no_question',
  NO_ANSWER_GIVEN: 'dungeo.answer.no_answer_given',
  TRIVIA_NOT_STARTED: 'dungeo.answer.trivia_not_started',
  TRIVIA_ALREADY_PASSED: 'dungeo.answer.trivia_already_passed',
  TRIVIA_ALREADY_FAILED: 'dungeo.answer.trivia_already_failed'
} as const;
