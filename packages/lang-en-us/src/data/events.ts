/**
 * @file English Event Message Templates
 * @description Templates for event success messages
 */

import { IFEvents } from '@sharpee/stdlib/constants';

/**
 * Message templates for IF events
 * Uses template literals with {variable} placeholders
 */
export const eventMessages: Partial<Record<IFEvents, string>> = {
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
  [IFEvents.ACHIEVEMENT_UNLOCKED]: "[Achievement unlocked: {achievement}]",
  [IFEvents.PUZZLE_SOLVED]: "[You've solved a puzzle!]",
  
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
