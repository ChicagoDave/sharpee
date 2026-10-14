/**
 * Message constants for the inserting action
 * Used by validate() and blocked() for consistent error messages
 */
export const InsertingMessages = {
  NO_TARGET: 'no_target',
  NO_DESTINATION: 'no_destination',
  NOT_HELD: 'not_held',
  NOT_INSERTABLE: 'not_insertable',
  NOT_CONTAINER: 'not_container',
  ALREADY_THERE: 'already_there',
  INSERTED: 'inserted',
  WONT_FIT: 'wont_fit',
  CONTAINER_CLOSED: 'container_closed',
  /** The delegated putting validate refused on capacity (ADR-369 D2); rendered under inserting's id. */
  NO_ROOM: 'no_room',
  CANT_INSERT: 'cant_insert',
  NOTHING_TO_INSERT: 'nothing_to_insert'
} as const;
