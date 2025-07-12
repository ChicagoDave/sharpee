/**
 * @file English Event Message Templates
 * @description Templates for event success messages
 */

/**
 * Standard Interactive Fiction events
 * These match the event types used in the IF system
 */
export const IFEvents = {
  // Core object manipulation
  TAKEN: 'taken',
  DROPPED: 'dropped',
  MOVED: 'moved',
  EXAMINED: 'examined',
  PUSHED: 'pushed',
  PULLED: 'pulled',
  TURNED: 'turned',
  USED: 'used',
  
  // Item-specific events
  ITEM_TAKEN: 'item_taken',
  ITEM_DROPPED: 'item_dropped',
  ITEM_MOVED: 'item_moved',
  ITEM_THROWN: 'item_thrown',
  ITEM_GIVEN: 'item_given',
  ITEM_SHOWN: 'item_shown',
  ITEM_EXAMINED: 'item_examined',
  ITEM_DESTROYED: 'item_destroyed',
  ITEM_USED: 'item_used',
  ITEM_WORN: 'item_worn',
  ITEM_REMOVED: 'item_removed',
  ITEM_EATEN: 'item_eaten',
  ITEM_DRUNK: 'item_drunk',
  ITEM_TOO_HEAVY: 'item_too_heavy',
  
  // Container/supporter events  
  PUT_IN: 'put_in',
  PUT_ON: 'put_on',
  REMOVED_FROM: 'removed_from',
  ITEM_PUT_IN: 'item_put_in',
  ITEM_PUT_ON: 'item_put_on',
  ITEM_REMOVED_FROM: 'item_removed_from',
  CONTAINER_OPENED: 'container_opened',
  CONTAINER_CLOSED: 'container_closed',
  CONTAINER_LOCKED: 'container_locked',
  CONTAINER_UNLOCKED: 'container_unlocked',
  CONTAINER_EMPTIED: 'container_emptied',
  
  // Openable events
  OPENED: 'opened',
  CLOSED: 'closed',
  
  // Door events
  DOOR_OPENED: 'door_opened',
  DOOR_CLOSED: 'door_closed',
  DOOR_LOCKED: 'door_locked',
  DOOR_UNLOCKED: 'door_unlocked',
  DOOR_KNOCKED: 'door_knocked',
  
  // Device events
  DEVICE_SWITCHED_ON: 'device_switched_on',
  DEVICE_SWITCHED_OFF: 'device_switched_off',
  DEVICE_ACTIVATED: 'device_activated',
  DEVICE_DEACTIVATED: 'device_deactivated',
  DEVICE_USED: 'device_used',
  DEVICE_BROKEN: 'device_broken',
  DEVICE_FIXED: 'device_fixed',
  
  // Movement events
  ROOM_ENTERED: 'room_entered',
  ROOM_EXITED: 'room_exited',
  PLAYER_MOVED: 'player_moved',
  PLAYER_ENTERED: 'player_entered',
  PLAYER_EXITED: 'player_exited',
  NPC_MOVED: 'npc_moved',
  NPC_ENTERED: 'npc_entered',
  NPC_EXITED: 'npc_exited',
  MOVEMENT_BLOCKED: 'movement_blocked',
  
  // Room/location events
  ROOM_DESCRIBED: 'room_described',
  ROOM_FIRST_ENTERED: 'room_first_entered',
  ROOM_ILLUMINATED: 'room_illuminated',
  ROOM_DARKENED: 'room_darkened',
  LOCATION_ILLUMINATED: 'location_illuminated',
  LOCATION_DARKENED: 'location_darkened',
  
  // Character interaction events
  NPC_TALKED_TO: 'npc_talked_to',
  NPC_ASKED_ABOUT: 'npc_asked_about',
  NPC_TOLD_ABOUT: 'npc_told_about',
  NPC_GIVEN_ITEM: 'npc_given_item',
  NPC_SHOWN_ITEM: 'npc_shown_item',
  NPC_ATTACKED: 'npc_attacked',
  NPC_KISSED: 'npc_kissed',
  NPC_DIED: 'npc_died',
  
  // Discovery events
  SECRET_DISCOVERED: 'secret_discovered',
  HIDDEN_ITEM_REVEALED: 'hidden_item_revealed',
  NEW_EXIT_REVEALED: 'new_exit_revealed',
  
  // Inventory events
  INVENTORY_CHECKED: 'inventory_checked',
  INVENTORY_FULL: 'inventory_full',
  
  // Time/turn events
  TURN_PASSED: 'turn_passed',
  TIME_PASSED: 'time_passed',
  WAITED: 'waited',
  
  // Scene events
  SCENE_STARTED: 'scene_started',
  SCENE_ENDED: 'scene_ended',
  SCENE_CHANGED: 'scene_changed',
  
  // Score/achievement events
  SCORE_INCREASED: 'score_increased',
  SCORE_DISPLAYED: 'score_displayed',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  PUZZLE_SOLVED: 'puzzle_solved',
  
  // Help/info events
  HELP_DISPLAYED: 'help_displayed',
  ABOUT_DISPLAYED: 'about_displayed',
  
  // Game state events
  GAME_STARTED: 'game_started',
  GAME_ENDED: 'game_ended',
  GAME_WON: 'game_won',
  GAME_LOST: 'game_lost',
  GAME_SAVED: 'game_saved',
  GAME_RESTORED: 'game_restored',
  GAME_RESTARTED: 'game_restarted',
  
  // Parser/command events
  COMMAND_AMBIGUOUS: 'command_ambiguous',
  COMMAND_INCOMPLETE: 'command_incomplete',
  OBJECT_NOT_FOUND: 'object_not_found',
  VERB_NOT_UNDERSTOOD: 'verb_not_understood'
} as const;

// Create a type from the const object values
type IFEventType = typeof IFEvents[keyof typeof IFEvents];

/**
 * Message templates for IF events
 * Uses template literals with {variable} placeholders
 */
export const eventMessages: Partial<Record<IFEventType, string>> = {
  // Item manipulation
  [IFEvents.ITEM_TAKEN]: "Taken.",
  [IFEvents.ITEM_DROPPED]: "Dropped.",
  [IFEvents.ITEM_MOVED]: "You move {item} to {location}.",
  [IFEvents.ITEM_THROWN]: "You throw {item}.",
  [IFEvents.ITEM_GIVEN]: "You give {item} to {recipient}.",
  [IFEvents.ITEM_SHOWN]: "You show {item} to {recipient}.",
  [IFEvents.ITEM_EXAMINED]: "{description}",
  [IFEvents.ITEM_DESTROYED]: "{item} is destroyed.",
  [IFEvents.ITEM_USED]: "You use {item}.",
  
  // General open/close
  [IFEvents.OPENED]: "You open {object}.",
  [IFEvents.CLOSED]: "You close {object}.",
  [IFEvents.TAKEN]: "Taken.",
  [IFEvents.DROPPED]: "Dropped.",
  
  // Container events
  [IFEvents.CONTAINER_OPENED]: "You open {container}.",
  [IFEvents.CONTAINER_CLOSED]: "You close {container}.",
  [IFEvents.CONTAINER_LOCKED]: "You lock {container}.",
  [IFEvents.CONTAINER_UNLOCKED]: "You unlock {container}.",
  [IFEvents.ITEM_PUT_IN]: "You put {item} in {container}.",
  [IFEvents.ITEM_PUT_ON]: "You put {item} on {supporter}.",
  [IFEvents.ITEM_REMOVED_FROM]: "You take {item} from {container}.",
  [IFEvents.CONTAINER_EMPTIED]: "You empty {container}.",
  
  // Door events
  [IFEvents.DOOR_OPENED]: "You open {door}.",
  [IFEvents.DOOR_CLOSED]: "You close {door}.",
  [IFEvents.DOOR_LOCKED]: "You lock {door}.",
  [IFEvents.DOOR_UNLOCKED]: "You unlock {door}.",
  [IFEvents.DOOR_KNOCKED]: "You knock on {door}.",
  
  // Wearable events
  [IFEvents.ITEM_WORN]: "You put on {item}.",
  [IFEvents.ITEM_REMOVED]: "You take off {item}.",
  
  // Device events
  [IFEvents.DEVICE_SWITCHED_ON]: "You switch on {device}.",
  [IFEvents.DEVICE_SWITCHED_OFF]: "You switch off {device}.",
  [IFEvents.DEVICE_ACTIVATED]: "{device} activates.",
  [IFEvents.DEVICE_DEACTIVATED]: "{device} deactivates.",
  [IFEvents.DEVICE_USED]: "You use {device}.",
  [IFEvents.DEVICE_BROKEN]: "{device} breaks!",
  [IFEvents.DEVICE_FIXED]: "You fix {device}.",
  
  // Consumption events
  [IFEvents.ITEM_EATEN]: "You eat {item}.",
  [IFEvents.ITEM_DRUNK]: "You drink {item}.",
  
  // Device manipulation events
  [IFEvents.PUSHED]: "You push {target}.",
  [IFEvents.PULLED]: "You pull {target}.",
  [IFEvents.TURNED]: "You turn {target}.",
  [IFEvents.USED]: "You use {target}.",
  
  // Movement events
  [IFEvents.PLAYER_MOVED]: "You go {direction}.",
  [IFEvents.PLAYER_ENTERED]: "You enter {location}.",
  [IFEvents.PLAYER_EXITED]: "You leave {location}.",
  [IFEvents.NPC_MOVED]: "{actor} goes {direction}.",
  [IFEvents.NPC_ENTERED]: "{actor} arrives from {direction}.",
  [IFEvents.NPC_EXITED]: "{actor} leaves to {direction}.",
  [IFEvents.MOVEMENT_BLOCKED]: "You can't go that way.",
  
  // Room/location events
  [IFEvents.ROOM_DESCRIBED]: "{description}",
  [IFEvents.ROOM_FIRST_ENTERED]: "{description}",
  [IFEvents.ROOM_ENTERED]: "You enter {room}.",
  [IFEvents.ROOM_EXITED]: "You leave {room}.",
  [IFEvents.ROOM_ILLUMINATED]: "The room is now lit.",
  [IFEvents.ROOM_DARKENED]: "The room goes dark.",
  [IFEvents.LOCATION_ILLUMINATED]: "The area is now lit.",
  [IFEvents.LOCATION_DARKENED]: "The area goes dark.",
  
  // Character interaction events
  [IFEvents.NPC_TALKED_TO]: "You talk to {npc}.",
  [IFEvents.NPC_ASKED_ABOUT]: "You ask {npc} about {topic}.",
  [IFEvents.NPC_TOLD_ABOUT]: "You tell {npc} about {topic}.",
  [IFEvents.NPC_GIVEN_ITEM]: "You give {item} to {npc}.",
  [IFEvents.NPC_SHOWN_ITEM]: "You show {item} to {npc}.",
  [IFEvents.NPC_ATTACKED]: "You attack {npc}!",
  [IFEvents.NPC_KISSED]: "You kiss {npc}.",
  [IFEvents.NPC_DIED]: "{npc} dies!",
  
  // Discovery events
  [IFEvents.SECRET_DISCOVERED]: "You've discovered a secret!",
  [IFEvents.HIDDEN_ITEM_REVEALED]: "You discover {item}!",
  [IFEvents.NEW_EXIT_REVEALED]: "A new exit has been revealed!",
  
  // Inventory events
  [IFEvents.INVENTORY_CHECKED]: "You are carrying: {items}",
  [IFEvents.INVENTORY_FULL]: "You're carrying too much already.",
  [IFEvents.ITEM_TOO_HEAVY]: "That's too heavy to pick up.",
  
  // Time/turn events
  [IFEvents.TURN_PASSED]: "Time passes.",
  [IFEvents.TIME_PASSED]: "Time passes.",
  [IFEvents.WAITED]: "You wait.",
  
  // Scene events
  [IFEvents.SCENE_STARTED]: "{scene} begins.",
  [IFEvents.SCENE_ENDED]: "{scene} ends.",
  [IFEvents.SCENE_CHANGED]: "The scene changes.",
  
  // Score/achievement events
  [IFEvents.SCORE_INCREASED]: "[Your score has gone up by {points} points.]",
  [IFEvents.SCORE_DISPLAYED]: "", // Handled by template system
  [IFEvents.ACHIEVEMENT_UNLOCKED]: "[Achievement unlocked: {achievement}]",
  [IFEvents.PUZZLE_SOLVED]: "[You've solved a puzzle!]",
  
  // Help/info events
  [IFEvents.HELP_DISPLAYED]: "", // Handled by template system
  [IFEvents.ABOUT_DISPLAYED]: "", // Handled by template system,
  
  // Game state events
  [IFEvents.GAME_STARTED]: "Welcome to {title}!",
  [IFEvents.GAME_ENDED]: "The game has ended.",
  [IFEvents.GAME_WON]: "*** You have won! ***",
  [IFEvents.GAME_LOST]: "*** You have lost. ***",
  [IFEvents.GAME_SAVED]: "Game saved.",
  [IFEvents.GAME_RESTORED]: "Game restored.",
  [IFEvents.GAME_RESTARTED]: "Game restarted.",
  
  // Parser/command events
  [IFEvents.COMMAND_AMBIGUOUS]: "Which do you mean: {options}?",
  [IFEvents.COMMAND_INCOMPLETE]: "You'll need to be more specific.",
  [IFEvents.OBJECT_NOT_FOUND]: "You can't see any such thing.",
  [IFEvents.VERB_NOT_UNDERSTOOD]: "I don't understand that verb."
};

/**
 * Complex event message functions for events that need more logic
 */
export const eventMessageFunctions = {
  /**
   * Format inventory display
   */
  formatInventory: (items: string[], worn: string[]): string => {
    if (items.length === 0) {
      return "You are carrying nothing.";
    }
    
    let message = "You are carrying:\n";
    items.forEach(item => {
      message += `  ${item}`;
      if (worn.includes(item)) {
        message += " (being worn)";
      }
      message += "\n";
    });
    
    return message.trim();
  },
  
  /**
   * Format room description with items
   */
  formatRoomDescription: (description: string, items: string[]): string => {
    let message = description;
    
    if (items.length > 0) {
      message += "\n\n";
      if (items.length === 1) {
        message += `You can see ${items[0]} here.`;
      } else {
        const lastItem = items.pop();
        message += `You can see ${items.join(", ")} and ${lastItem} here.`;
      }
    }
    
    return message;
  },
  
  /**
   * Format container contents
   */
  formatContainerContents: (container: string, items: string[]): string => {
    if (items.length === 0) {
      return `The ${container} is empty.`;
    }
    
    let message = `The ${container} contains:\n`;
    items.forEach(item => {
      message += `  ${item}\n`;
    });
    
    return message.trim();
  }
};
