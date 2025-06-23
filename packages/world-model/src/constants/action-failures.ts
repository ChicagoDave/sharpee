/**
 * Action failure reasons for the IF system.
 * 
 * These are semantic codes used by behaviors to indicate why an action failed.
 * The language layer maps these to appropriate messages.
 */

export const ActionFailureReason = {
  // Scope and reachability
  NOT_VISIBLE: 'not_visible',
  NOT_REACHABLE: 'not_reachable',
  NOT_IN_SCOPE: 'not_in_scope',
  
  // Object state
  FIXED_IN_PLACE: 'fixed_in_place',
  ALREADY_OPEN: 'already_open',
  ALREADY_CLOSED: 'already_closed',
  NOT_OPENABLE: 'not_openable',
  LOCKED: 'locked',
  NOT_LOCKABLE: 'not_lockable',
  ALREADY_LOCKED: 'already_locked',
  ALREADY_UNLOCKED: 'already_unlocked',
  
  // Container and supporter
  CONTAINER_FULL: 'container_full',
  CONTAINER_CLOSED: 'container_closed',
  NOT_A_CONTAINER: 'not_a_container',
  NOT_A_SUPPORTER: 'not_a_supporter',
  ALREADY_IN_CONTAINER: 'already_in_container',
  
  // Wearable
  NOT_WEARABLE: 'not_wearable',
  ALREADY_WEARING: 'already_wearing',
  NOT_WEARING: 'not_wearing',
  WORN_BY_OTHER: 'worn_by_other',
  
  // Portable/weight
  TOO_HEAVY: 'too_heavy',
  CARRYING_TOO_MUCH: 'carrying_too_much',
  
  // Keys and unlocking
  WRONG_KEY: 'wrong_key',
  NO_KEY_SPECIFIED: 'no_key_specified',
  NOT_A_KEY: 'not_a_key',
  
  // Device/switchable
  ALREADY_ON: 'already_on',
  ALREADY_OFF: 'already_off',
  NOT_SWITCHABLE: 'not_switchable',
  NO_POWER: 'no_power',
  
  // Movement
  NO_EXIT_THAT_WAY: 'no_exit_that_way',
  CANT_GO_THAT_WAY: 'cant_go_that_way',
  DOOR_CLOSED: 'door_closed',
  DOOR_LOCKED: 'door_locked',
  
  // General
  CANT_DO_THAT: 'cant_do_that',
  NOT_IMPLEMENTED: 'not_implemented',
  INVALID_TARGET: 'invalid_target',
  NOTHING_HAPPENS: 'nothing_happens',
  
  // Actor state
  ACTOR_CANT_SEE: 'actor_cant_see',
  ACTOR_CANT_REACH: 'actor_cant_reach',
  ACTOR_BUSY: 'actor_busy',
  
  // Edible
  NOT_EDIBLE: 'not_edible',
  NOTHING_LEFT: 'nothing_left',
  
  // Readable
  NOT_READABLE: 'not_readable',
  NOTHING_WRITTEN: 'nothing_written',
} as const;

export type ActionFailureReasonType = typeof ActionFailureReason[keyof typeof ActionFailureReason];
