/**
 * @file English Message Templates
 * @description Message templates for action failure reasons and system messages
 */

import { ActionFailureReason } from '@sharpee/stdlib/constants';

/**
 * Mapping of action failure reasons to English messages
 */
export const failureMessages: Record<ActionFailureReason, string> = {
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
  
  // Container and supporter
  [ActionFailureReason.CONTAINER_FULL]: "There's no more room inside.",
  [ActionFailureReason.CONTAINER_CLOSED]: "You'll need to open it first.",
  [ActionFailureReason.NOT_A_CONTAINER]: "That can't contain things.",
  [ActionFailureReason.NOT_A_SUPPORTER]: "You can't put things on top of that.",
  [ActionFailureReason.ALREADY_IN_CONTAINER]: "It's already there.",
  
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
