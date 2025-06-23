/**
 * Enum for common action failure reasons in the IF system.
 * 
 * These are used by actions to indicate why an action failed,
 * allowing the text service to map them to appropriate messages
 * in the current language.
 */
export enum ActionFailureReason {
  // Scope and reachability
  NOT_VISIBLE = 'NOT_VISIBLE',
  NOT_REACHABLE = 'NOT_REACHABLE',
  NOT_IN_SCOPE = 'NOT_IN_SCOPE',
  
  // Object state
  FIXED_IN_PLACE = 'FIXED_IN_PLACE',
  ALREADY_OPEN = 'ALREADY_OPEN',
  ALREADY_CLOSED = 'ALREADY_CLOSED',
  NOT_OPENABLE = 'NOT_OPENABLE',
  LOCKED = 'LOCKED',
  NOT_LOCKABLE = 'NOT_LOCKABLE',
  ALREADY_LOCKED = 'ALREADY_LOCKED',
  ALREADY_UNLOCKED = 'ALREADY_UNLOCKED',
  
  // Container and supporter
  CONTAINER_FULL = 'CONTAINER_FULL',
  CONTAINER_CLOSED = 'CONTAINER_CLOSED',
  NOT_A_CONTAINER = 'NOT_A_CONTAINER',
  NOT_A_SUPPORTER = 'NOT_A_SUPPORTER',
  ALREADY_IN_CONTAINER = 'ALREADY_IN_CONTAINER',
  
  // Wearable
  NOT_WEARABLE = 'NOT_WEARABLE',
  ALREADY_WEARING = 'ALREADY_WEARING',
  NOT_WEARING = 'NOT_WEARING',
  WORN_BY_OTHER = 'WORN_BY_OTHER',
  
  // Portable/weight
  TOO_HEAVY = 'TOO_HEAVY',
  CARRYING_TOO_MUCH = 'CARRYING_TOO_MUCH',
  
  // Keys and unlocking
  WRONG_KEY = 'WRONG_KEY',
  NO_KEY_SPECIFIED = 'NO_KEY_SPECIFIED',
  NOT_A_KEY = 'NOT_A_KEY',
  
  // Device/switchable
  ALREADY_ON = 'ALREADY_ON',
  ALREADY_OFF = 'ALREADY_OFF',
  NOT_SWITCHABLE = 'NOT_SWITCHABLE',
  
  // Movement
  NO_EXIT_THAT_WAY = 'NO_EXIT_THAT_WAY',
  CANT_GO_THAT_WAY = 'CANT_GO_THAT_WAY',
  DOOR_CLOSED = 'DOOR_CLOSED',
  DOOR_LOCKED = 'DOOR_LOCKED',
  
  // Dialogue and NPCs
  CANT_TALK_TO_THAT = 'CANT_TALK_TO_THAT',
  NO_RESPONSE = 'NO_RESPONSE',
  NOT_A_PERSON = 'NOT_A_PERSON',
  
  // General
  CANT_DO_THAT = 'CANT_DO_THAT',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
  INVALID_TARGET = 'INVALID_TARGET',
  AMBIGUOUS_TARGET = 'AMBIGUOUS_TARGET',
  NOTHING_HAPPENS = 'NOTHING_HAPPENS',
  
  // Actor state
  ACTOR_CANT_SEE = 'ACTOR_CANT_SEE',
  ACTOR_CANT_REACH = 'ACTOR_CANT_REACH',
  ACTOR_BUSY = 'ACTOR_BUSY',
  
  // Edible
  NOT_EDIBLE = 'NOT_EDIBLE',
  
  // Readable
  NOT_READABLE = 'NOT_READABLE',
  NOTHING_WRITTEN = 'NOTHING_WRITTEN',
  
  // Giving/receiving
  WONT_ACCEPT = 'WONT_ACCEPT',
  CANT_GIVE_TO_SELF = 'CANT_GIVE_TO_SELF',
  
  // Using/manipulation
  CANT_USE_THAT = 'CANT_USE_THAT',
  CANT_USE_TOGETHER = 'CANT_USE_TOGETHER',
  NOTHING_TO_USE_WITH = 'NOTHING_TO_USE_WITH',
}

/**
 * Type guard to check if a value is an ActionFailureReason
 */
export function isActionFailureReason(value: any): value is ActionFailureReason {
  return Object.values(ActionFailureReason).includes(value);
}