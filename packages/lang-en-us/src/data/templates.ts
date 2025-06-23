/**
 * @file English Message Templates
 * @description Message templates for actions and events in English
 */

import { IFActions, IFEvents } from '@sharpee/stdlib/constants';

/**
 * English message templates
 */
export const englishTemplates = {
  /**
   * Action message templates
   * Format: "action.phase.key" -> template
   */
  actions: {
    // Taking action
    'taking.check.already_have': 'You already have {item}.',
    'taking.check.not_here': "You don't see {item} here.",
    'taking.check.cannot_take': "You can't take {item}.",
    'taking.check.too_heavy': '{item:cap} is too heavy to pick up.',
    'taking.perform.success': 'Taken.',
    'taking.report.success': 'You take {item}.',
    
    // Dropping action
    'dropping.check.not_holding': "You aren't holding {item}.",
    'dropping.perform.success': 'Dropped.',
    'dropping.report.success': 'You drop {item}.',
    
    // Opening action
    'opening.check.already_open': '{item:cap} is already open.',
    'opening.check.not_openable': "You can't open {item}.",
    'opening.check.locked': '{item:cap} is locked.',
    'opening.perform.success': 'Opened.',
    'opening.report.success': 'You open {item}.',
    'opening.report.reveal': 'Opening {container} reveals {contents}.',
    
    // Closing action
    'closing.check.already_closed': '{item:cap} is already closed.',
    'closing.check.not_closable': "You can't close {item}.",
    'closing.perform.success': 'Closed.',
    'closing.report.success': 'You close {item}.',
    
    // Examining action
    'examining.check.not_visible': "You can't see {item} here.",
    'examining.report.basic': '{description}',
    'examining.report.container_open': '{description} {item:cap} is open.',
    'examining.report.container_closed': '{description} {item:cap} is closed.',
    'examining.report.container_empty': '{item:cap} is empty.',
    'examining.report.container_contents': '{item:cap} contains {contents}.',
    'examining.report.supporter_contents': 'On {item} you see {contents}.',
    
    // Looking action
    'looking.report.room_name': '{name}',
    'looking.report.room_description': '{description}',
    'looking.report.exits': 'Exits: {exits}.',
    'looking.report.contents': 'You can see {items} here.',
    'looking.report.also_here': 'You can also see {items} here.',
    
    // Going action
    'going.check.no_exit': "You can't go that way.",
    'going.check.door_closed': 'The {door} is closed.',
    'going.check.door_locked': 'The {door} is locked.',
    'going.perform.success': 'You go {direction}.',
    'going.report.enter_room': '{description}',
    
    // Inventory action
    'inventory.empty': "You aren't carrying anything.",
    'inventory.list': 'You are carrying:',
    'inventory.wearing': 'You are wearing:',
    
    // Locking/Unlocking
    'locking.check.not_lockable': "You can't lock {item}.",
    'locking.check.already_locked': '{item:cap} is already locked.',
    'locking.check.need_key': 'You need a key to lock {item}.',
    'locking.check.wrong_key': "{key:cap} doesn't fit the lock.",
    'locking.perform.success': 'Locked.',
    'locking.report.success': 'You lock {item} with {key}.',
    
    'unlocking.check.not_lockable': "You can't unlock {item}.",
    'unlocking.check.already_unlocked': '{item:cap} is already unlocked.',
    'unlocking.check.need_key': 'You need a key to unlock {item}.',
    'unlocking.check.wrong_key': "{key:cap} doesn't fit the lock.",
    'unlocking.perform.success': 'Unlocked.',
    'unlocking.report.success': 'You unlock {item} with {key}.',
    
    // Switching on/off
    'switching_on.check.already_on': '{item:cap} is already on.',
    'switching_on.check.not_switchable': "You can't switch {item} on.",
    'switching_on.perform.success': 'Switched on.',
    'switching_on.report.success': 'You switch {item} on.',
    
    'switching_off.check.already_off': '{item:cap} is already off.',
    'switching_off.check.not_switchable': "You can't switch {item} off.",
    'switching_off.perform.success': 'Switched off.',
    'switching_off.report.success': 'You switch {item} off.',
    
    // Putting action
    'putting.check.not_holding': "You aren't holding {item}.",
    'putting.check.cannot_put': "You can't put {item} {preposition} {target}.",
    'putting.check.put_self': "You can't put something inside itself.",
    'putting.check.already_there': '{item:cap} is already {preposition} {target}.',
    'putting.perform.success': 'Done.',
    'putting.report.success': 'You put {item} {preposition} {target}.',
    
    // Giving action
    'giving.check.not_holding': "You aren't holding {item}.",
    'giving.check.not_person': "You can only give things to people.",
    'giving.check.self': "You already have {item}.",
    'giving.perform.success': 'Given.',
    'giving.report.success': 'You give {item} to {recipient}.',
    'giving.report.npc_accepts': '{recipient:cap} accepts {item}.',
    'giving.report.npc_refuses': '{recipient:cap} politely refuses.',
    
    // Talking action
    'talking.check.not_person': "You can't talk to {target}.",
    'talking.check.no_response': '{target:cap} has nothing to say right now.',
    'talking.report.greeting': '{target:cap} says "Hello."',
    
    // Eating/Drinking
    'eating.check.not_edible': "You can't eat {item}.",
    'eating.check.not_holding': 'You need to be holding {item} first.',
    'eating.perform.success': 'Eaten.',
    'eating.report.success': 'You eat {item}. Not bad.',
    
    'drinking.check.not_drinkable': "You can't drink {item}.",
    'drinking.check.not_holding': 'You need to be holding {item} first.',
    'drinking.perform.success': 'Drunk.',
    'drinking.report.success': 'You drink {item}. Refreshing.',
    
    // Wearing/Removing
    'wearing.check.not_wearable': "You can't wear {item}.",
    'wearing.check.not_holding': 'You need to be holding {item} first.',
    'wearing.check.already_wearing': 'You are already wearing {item}.',
    'wearing.perform.success': 'Worn.',
    'wearing.report.success': 'You put on {item}.',
    
    'taking_off.check.not_wearing': "You aren't wearing {item}.",
    'taking_off.perform.success': 'Removed.',
    'taking_off.report.success': 'You take off {item}.',
    
    // Generic/fallback messages
    'generic.not_understood': "I didn't understand that.",
    'generic.nothing_happens': 'Nothing happens.',
    'generic.ok': 'OK.',
    'generic.done': 'Done.',
    'generic.cannot_do': "You can't do that.",
    'generic.not_here': "You don't see that here.",
    'generic.be_more_specific': 'You need to be more specific.',
    'generic.which_one': 'Which {item} do you mean?',
  },
  
  /**
   * Event message templates
   */
  events: {
    [IFEvents.GAME_STARTED]: 'Welcome to the game!',
    [IFEvents.GAME_ENDED]: 'Thanks for playing!',
    [IFEvents.TURN_PASSED]: '',
    [IFEvents.ROOM_ENTERED]: '',
    [IFEvents.ROOM_EXITED]: '',
    [IFEvents.ITEM_TAKEN]: '',
    [IFEvents.ITEM_DROPPED]: '',
    [IFEvents.CONTAINER_OPENED]: '',
    [IFEvents.CONTAINER_CLOSED]: '',
    [IFEvents.SCORE_INCREASED]: 'Your score has increased by {points} points.',
    [IFEvents.GAME_WON]: 'Congratulations! You have won the game!',
    [IFEvents.GAME_LOST]: 'Game over. Better luck next time.',
  }
};
