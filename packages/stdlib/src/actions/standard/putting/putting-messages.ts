/**
 * Message constants for the putting action
 * Used by validate() and blocked() for consistent error messages
 */
export const PuttingMessages = {
  NO_TARGET: 'no_target',
  NO_DESTINATION: 'no_destination',
  NOT_HELD: 'not_held',
  NOT_CONTAINER: 'not_container',
  NOT_SURFACE: 'not_surface',
  CONTAINER_CLOSED: 'container_closed',
  ALREADY_THERE: 'already_there',
  PUT_IN: 'put_in',
  PUT_ON: 'put_on',
  CANT_PUT_IN_ITSELF: 'cant_put_in_itself',
  CANT_PUT_ON_ITSELF: 'cant_put_on_itself',
  NO_ROOM: 'no_room',
  NO_SPACE: 'no_space',
  CANT_PUT: 'cant_put'
} as const;
