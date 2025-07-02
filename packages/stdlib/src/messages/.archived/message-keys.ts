/**
 * Strongly typed message keys for Sharpee
 * No raw strings allowed - all text must use these keys
 */

// Base types for message keys
export interface MessageKey<T extends string = string> {
  readonly key: T;
  readonly namespace: string;
}

// Factory for creating namespaced keys
export function createMessageKey<T extends string>(namespace: string, key: T): MessageKey<T> {
  return {
    key,
    namespace,
  };
}

// Standard action messages
export const ActionMessages = {
  // Taking
  CANT_TAKE_THAT: createMessageKey('actions.take', 'cant_take_that'),
  ALREADY_CARRYING: createMessageKey('actions.take', 'already_carrying'),
  TAKEN: createMessageKey('actions.take', 'taken'),
  NOT_A_CONTAINER: createMessageKey('actions.take', 'not_a_container'),
  
  // Dropping
  NOT_CARRYING: createMessageKey('actions.drop', 'not_carrying'),
  DROPPED: createMessageKey('actions.drop', 'dropped'),
  
  // Examining
  NOTHING_SPECIAL: createMessageKey('actions.examine', 'nothing_special'),
  CANT_SEE_THAT: createMessageKey('actions.examine', 'cant_see_that'),
  
  // Opening
  ALREADY_OPEN: createMessageKey('actions.open', 'already_open'),
  CANT_OPEN_THAT: createMessageKey('actions.open', 'cant_open_that'),
  OPENED: createMessageKey('actions.open', 'opened'),
  ITS_LOCKED: createMessageKey('actions.open', 'its_locked'),
  
  // Going
  CANT_GO_THAT_WAY: createMessageKey('actions.go', 'cant_go_that_way'),
  MOVED_TO: createMessageKey('actions.go', 'moved_to'),
} as const;

// System messages
export const SystemMessages = {
  UNKNOWN_COMMAND: createMessageKey('system', 'unknown_command'),
  AMBIGUOUS_COMMAND: createMessageKey('system', 'ambiguous_command'),
  NOTHING_HERE: createMessageKey('system', 'nothing_here'),
  SAVE_SUCCESSFUL: createMessageKey('system', 'save_successful'),
  LOAD_SUCCESSFUL: createMessageKey('system', 'load_successful'),
} as const;

// Entity-specific message key factory
export const EntityMessages = {
  description: (entityId: string) => createMessageKey('entity.description', entityId),
  name: (entityId: string) => createMessageKey('entity.name', entityId),
  contents: (entityId: string) => createMessageKey('entity.contents', entityId),
} as const;

// Location-specific message key factory  
export const LocationMessages = {
  description: (locationId: string) => createMessageKey('location.description', locationId),
  name: (locationId: string) => createMessageKey('location.name', locationId),
  exits: (locationId: string) => createMessageKey('location.exits', locationId),
} as const;

// Type for all standard message keys
export type StandardMessageKey = 
  | typeof ActionMessages[keyof typeof ActionMessages]
  | typeof SystemMessages[keyof typeof SystemMessages];

// Type helper for message parameters
export interface MessageParams {
  [key: string]: string | number | boolean;
}

// Message with parameters
export interface ParameterizedMessage<K extends MessageKey = MessageKey> {
  key: K;
  params?: MessageParams;
}

// Helper to create parameterized messages
export function withParams<K extends MessageKey>(
  key: K,
  params: MessageParams
): ParameterizedMessage<K> {
  return { key, params };
}

// Re-export from message-resolver for convenience
export { getMessage, messageResolver } from './message-resolver';
