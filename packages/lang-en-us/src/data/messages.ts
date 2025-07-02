/**
 * @file English Message Templates
 * @description Message templates for action failure reasons and system messages
 */

/**
 * Action failure reasons
 * These match the failure codes used in the IF system
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
  STILL_OPEN: 'still_open',
  
  // Container and supporter
  CONTAINER_FULL: 'container_full',
  CONTAINER_CLOSED: 'container_closed',
  NOT_A_CONTAINER: 'not_a_container',
  NOT_A_SUPPORTER: 'not_a_supporter',
  ALREADY_IN_CONTAINER: 'already_in_container',
  NOT_IN_CONTAINER: 'not_in_container',
  
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
  
  // Movement
  NO_EXIT_THAT_WAY: 'no_exit_that_way',
  CANT_GO_THAT_WAY: 'cant_go_that_way',
  DOOR_CLOSED: 'door_closed',
  DOOR_LOCKED: 'door_locked',
  TOO_DARK: 'too_dark',
  
  // Dialogue and NPCs
  CANT_TALK_TO_THAT: 'cant_talk_to_that',
  NO_RESPONSE: 'no_response',
  NOT_A_PERSON: 'not_a_person',
  
  // General
  CANT_DO_THAT: 'cant_do_that',
  NOT_IMPLEMENTED: 'not_implemented',
  INVALID_TARGET: 'invalid_target',
  AMBIGUOUS_TARGET: 'ambiguous_target',
  NOTHING_HAPPENS: 'nothing_happens',
  
  // Actor state
  ACTOR_CANT_SEE: 'actor_cant_see',
  ACTOR_CANT_REACH: 'actor_cant_reach',
  ACTOR_BUSY: 'actor_busy',
  
  // Edible
  NOT_EDIBLE: 'not_edible',
  
  // Readable
  NOT_READABLE: 'not_readable',
  NOTHING_WRITTEN: 'nothing_written',
  
  // Giving/receiving
  WONT_ACCEPT: 'wont_accept',
  CANT_GIVE_TO_SELF: 'cant_give_to_self',
  
  // Using/manipulation
  CANT_USE_THAT: 'cant_use_that',
  CANT_USE_TOGETHER: 'cant_use_together',
  NOTHING_TO_USE_WITH: 'nothing_to_use_with'
} as const;

// Create a type from the const object values
type ActionFailureReasonType = typeof ActionFailureReason[keyof typeof ActionFailureReason];

/**
 * Mapping of action failure reasons to English messages
 */
export const failureMessages: Record<ActionFailureReasonType, string> = {
  // Scope and reachability
  [ActionFailureReason.NOT_VISIBLE]: "You can't see any such thing.",
  [ActionFailureReason.NOT_REACHABLE]: "You can't reach that from here.",
  [ActionFailureReason.NOT_IN_SCOPE]: "That's not available right now.",
  
  // Object state
  [ActionFailureReason.FIXED_IN_PLACE]: "That's fixed in place.",
  [ActionFailureReason.ALREADY_OPEN]: "That's already open.",
  [ActionFailureReason.ALREADY_CLOSED]: "That's already closed.",
  [ActionFailureReason.NOT_OPENABLE]: "That's not something you can open.",
  [ActionFailureReason.LOCKED]: "It seems to be locked.",
  [ActionFailureReason.NOT_LOCKABLE]: "That doesn't have a lock.",
  [ActionFailureReason.ALREADY_LOCKED]: "It's already locked.",
  [ActionFailureReason.ALREADY_UNLOCKED]: "It's already unlocked.",
  [ActionFailureReason.STILL_OPEN]: "You can't do that while it's open.",
  
  // Container and supporter
  [ActionFailureReason.CONTAINER_FULL]: "There's no more room inside.",
  [ActionFailureReason.CONTAINER_CLOSED]: "You'll need to open it first.",
  [ActionFailureReason.NOT_A_CONTAINER]: "That can't contain things.",
  [ActionFailureReason.NOT_A_SUPPORTER]: "You can't put things on top of that.",
  [ActionFailureReason.ALREADY_IN_CONTAINER]: "It's already there.",
  [ActionFailureReason.NOT_IN_CONTAINER]: "It's not in there.",
  
  // Wearable
  [ActionFailureReason.NOT_WEARABLE]: "You can't wear that.",
  [ActionFailureReason.ALREADY_WEARING]: "You're already wearing that.",
  [ActionFailureReason.NOT_WEARING]: "You're not wearing that.",
  [ActionFailureReason.WORN_BY_OTHER]: "Someone else is wearing that.",
  
  // Portable/weight
  [ActionFailureReason.TOO_HEAVY]: "That's too heavy to carry.",
  [ActionFailureReason.CARRYING_TOO_MUCH]: "You're carrying too much already.",
  
  // Keys and unlocking
  [ActionFailureReason.WRONG_KEY]: "That doesn't seem to be the right key.",
  [ActionFailureReason.NO_KEY_SPECIFIED]: "You'll need to specify what to unlock it with.",
  [ActionFailureReason.NOT_A_KEY]: "That doesn't look like it would unlock anything.",
  
  // Device/switchable
  [ActionFailureReason.ALREADY_ON]: "It's already on.",
  [ActionFailureReason.ALREADY_OFF]: "It's already off.",
  [ActionFailureReason.NOT_SWITCHABLE]: "That's not something you can switch.",
  
  // Movement
  [ActionFailureReason.NO_EXIT_THAT_WAY]: "You can't go that way.",
  [ActionFailureReason.CANT_GO_THAT_WAY]: "You can't go that way.",
  [ActionFailureReason.DOOR_CLOSED]: "The door is closed.",
  [ActionFailureReason.DOOR_LOCKED]: "The door is locked.",
  [ActionFailureReason.TOO_DARK]: "It's too dark to see where you're going.",
  
  // Dialogue and NPCs
  [ActionFailureReason.CANT_TALK_TO_THAT]: "You can only talk to people.",
  [ActionFailureReason.NO_RESPONSE]: "There is no response.",
  [ActionFailureReason.NOT_A_PERSON]: "You can only do that to a person.",
  
  // General
  [ActionFailureReason.CANT_DO_THAT]: "You can't do that.",
  [ActionFailureReason.NOT_IMPLEMENTED]: "That action isn't available.",
  [ActionFailureReason.INVALID_TARGET]: "That's not a valid target.",
  [ActionFailureReason.AMBIGUOUS_TARGET]: "You'll need to be more specific.",
  [ActionFailureReason.NOTHING_HAPPENS]: "Nothing happens.",
  
  // Actor state
  [ActionFailureReason.ACTOR_CANT_SEE]: "You can't see in the dark.",
  [ActionFailureReason.ACTOR_CANT_REACH]: "You can't reach that from your current position.",
  [ActionFailureReason.ACTOR_BUSY]: "You're too busy to do that right now.",
  
  // Edible
  [ActionFailureReason.NOT_EDIBLE]: "That's not something you can eat.",
  
  // Readable
  [ActionFailureReason.NOT_READABLE]: "There's nothing written on that.",
  [ActionFailureReason.NOTHING_WRITTEN]: "You see nothing special written there.",
  
  // Giving/receiving
  [ActionFailureReason.WONT_ACCEPT]: "They don't seem interested.",
  [ActionFailureReason.CANT_GIVE_TO_SELF]: "You can't give something to yourself.",
  
  // Using/manipulation
  [ActionFailureReason.CANT_USE_THAT]: "You can't use that.",
  [ActionFailureReason.CANT_USE_TOGETHER]: "You can't use those things together.",
  [ActionFailureReason.NOTHING_TO_USE_WITH]: "You need to specify what to use it with.",
};

/**
 * System messages for meta-commands and special situations
 */
export const systemMessages = {
  // Inventory
  inventoryEmpty: "You are carrying nothing.",
  inventoryHeader: "You are carrying:",
  inventoryWearing: " (being worn)",
  
  // Looking
  locationDescription: "You are in {location}.",
  canSee: "You can see {items} here.",
  canAlsoSee: "You can also see {items} here.",
  nothingSpecial: "You see nothing special.",
  insideContainer: "In the {container}:",
  onSupporter: "On the {supporter}:",
  
  // Save/Restore
  savePrompt: "Enter save game name:",
  saveSuccess: "Game saved.",
  saveFailed: "Failed to save game.",
  restorePrompt: "Enter save game name:",
  restoreSuccess: "Game restored.",
  restoreFailed: "Failed to restore game.",
  
  // Meta
  quitConfirm: "Are you sure you want to quit? (yes/no)",
  scoreDisplay: "Your score is {score} out of {maxScore}.",
  turnsDisplay: "You have taken {turns} turn(s).",
  
  // Parser
  unknownVerb: "I don't understand that verb.",
  unknownObject: "I don't know what '{object}' refers to.",
  ambiguousObject: "Which do you mean: {options}?",
  missingObject: "What do you want to {verb}?",
  missingIndirectObject: "What do you want to {verb} it {preposition}?",
  
  // General
  ok: "Okay.",
  done: "Done.",
  taken: "Taken.",
  dropped: "Dropped.",
};
