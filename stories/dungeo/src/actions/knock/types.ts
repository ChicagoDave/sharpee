/**
 * Knock Action Types
 */

export const KNOCK_ACTION_ID = 'dungeo.knock';

export const KnockMessages = {
  KNOCK_GENERIC: 'dungeo.knock.generic',
  KNOCK_DOOR: 'dungeo.knock.door',
  DM_APPEARS: 'dungeo.knock.dm_appears',
  DM_ALREADY_APPEARED: 'dungeo.knock.dm_already_appeared',
  TRIVIA_ALREADY_PASSED: 'dungeo.knock.trivia_already_passed',
  TRIVIA_ALREADY_FAILED: 'dungeo.knock.trivia_already_failed',
  NOTHING_TO_KNOCK: 'dungeo.knock.nothing_to_knock'
} as const;
