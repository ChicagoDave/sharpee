/**
 * SET DIAL Action Types
 *
 * Action for setting the sundial at the Parapet (1-8)
 */

export const SET_DIAL_ACTION_ID = 'dungeo.set-dial';

export const SetDialMessages = {
  SET_DIAL: 'dungeo.dial.set',
  DIAL_MUST_BE_1_TO_8: 'dungeo.dial.must_be_1_to_8',
  NOT_AT_PARAPET: 'dungeo.dial.not_at_parapet',
  NO_DIAL_HERE: 'dungeo.dial.no_dial_here'
} as const;

export type SetDialMessageId = typeof SetDialMessages[keyof typeof SetDialMessages];
