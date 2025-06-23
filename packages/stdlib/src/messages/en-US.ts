/**
 * English (US) messages for stdlib actions
 */

export const actionMessages: Record<string, string> = {
  // Taking action
  'action.taking.no_target': 'Take what?',
  'action.taking.cannot_take_self': "You can't take yourself.",
  'action.taking.already_held': "You're already carrying {item}.",
  'action.taking.not_takeable': "{item} can't be taken.",
  'action.taking.cannot_take_location': "You can't take the entire location!",
  'action.taking.not_accessible': "You can't reach {item}.",
  'action.taking.item_not_found': "That item doesn't seem to be anywhere.",
  
  // Dropping action
  'action.dropping.no_target': 'Drop what?',
  'action.dropping.not_held': "You're not holding {item}.",
  'action.dropping.cannot_drop_self': "You can't drop yourself!",
  'action.dropping.item_not_found': "You're not holding that.",
  
  // Opening action
  'action.opening.no_target': 'Open what?',
  'action.opening.not_openable': "{item} can't be opened.",
  'action.opening.already_open': "{item} is already open.",
  'action.opening.locked': "{item} is locked.",
  'action.opening.not_accessible': "You can't reach {item}.",
  'action.opening.cannot_open_self': "You can't open yourself!",
  
  // Closing action
  'action.closing.no_target': 'Close what?',
  'action.closing.not_closable': "{item} can't be closed.",
  'action.closing.already_closed': "{item} is already closed.",
  'action.closing.not_accessible': "You can't reach {item}.",
  'action.closing.cannot_close_self': "You can't close yourself!",
  
  // Examining action
  'action.examining.no_target': 'Examine what?',
  'action.examining.not_accessible': "You can't see {item} clearly from here.",
  'action.examining.no_description': "You see nothing special about {item}.",
  
  // Going action
  'action.going.no_direction': 'Go where?',
  'action.going.unknown_direction': "I don't understand that direction.",
  'action.going.no_exit': "You can't go that way.",
  'action.going.exit_locked': "The way {direction} is locked.",
  'action.going.exit_blocked': "Something is blocking the way {direction}.",
  
  // Locking action
  'action.locking.no_target': 'Lock what?',
  'action.locking.not_lockable': "{item} can't be locked.",
  'action.locking.already_locked': "{item} is already locked.",
  'action.locking.not_closed': "You need to close {item} first.",
  'action.locking.no_key': "You need a key to lock {item}.",
  'action.locking.wrong_key': "That key doesn't fit {item}.",
  'action.locking.not_accessible': "You can't reach {item}.",
  
  // Unlocking action
  'action.unlocking.no_target': 'Unlock what?',
  'action.unlocking.not_lockable': "{item} doesn't have a lock.",
  'action.unlocking.already_unlocked': "{item} is already unlocked.",
  'action.unlocking.no_key': "You need a key to unlock {item}.",
  'action.unlocking.wrong_key': "That key doesn't fit {item}.",
  'action.unlocking.not_accessible': "You can't reach {item}.",
  
  // Putting action
  'action.putting.no_object': 'Put what?',
  'action.putting.no_container': 'Put it where?',
  'action.putting.not_held': "You're not holding {item}.",
  'action.putting.not_container': "You can't put things in {container}.",
  'action.putting.container_closed': "{container} is closed.",
  'action.putting.container_full': "{container} is full.",
  'action.putting.put_in_self': "You can't put {item} inside itself!",
  'action.putting.not_accessible': "You can't reach {container}.",
  
  // Giving action
  'action.giving.no_object': 'Give what?',
  'action.giving.no_recipient': 'Give it to whom?',
  'action.giving.not_held': "You're not holding {item}.",
  'action.giving.not_person': "You can only give things to people.",
  'action.giving.give_to_self': "You already have {item}!",
  'action.giving.recipient_not_accessible': "You can't reach {recipient}.",
  'action.giving.recipient_refuses': "{recipient} doesn't want {item}.",
  
  // Using action
  'action.using.no_target': 'Use what?',
  'action.using.not_usable': "You can't use {item}.",
  'action.using.not_accessible': "You can't reach {item}.",
  'action.using.no_obvious_use': "You're not sure how to use {item}.",
  'action.using.need_target': 'Use {item} on what?',
  
  // Talking action
  'action.talking.no_target': 'Talk to whom?',
  'action.talking.not_person': "You can't talk to {target}.",
  'action.talking.not_accessible': "{target} is too far away to talk to.",
  'action.talking.no_response': "{target} doesn't respond.",
  
  // Asking action
  'action.asking.no_target': 'Ask whom?',
  'action.asking.no_topic': 'Ask about what?',
  'action.asking.not_person': "You can only ask people questions.",
  'action.asking.not_accessible': "{target} is too far away to ask.",
  'action.asking.no_knowledge': "{target} doesn't know anything about that.",
  
  // Telling action
  'action.telling.no_target': 'Tell whom?',
  'action.telling.no_topic': 'Tell about what?',
  'action.telling.not_person': "You can only tell things to people.",
  'action.telling.not_accessible': "{target} is too far away to tell.",
  'action.telling.not_interested': "{target} doesn't seem interested.",
  
  // Switching on action
  'action.switching_on.no_target': 'Switch on what?',
  'action.switching_on.not_switchable': "{item} can't be switched on.",
  'action.switching_on.already_on': "{item} is already on.",
  'action.switching_on.not_accessible': "You can't reach {item}.",
  'action.switching_on.no_power': "{item} has no power.",
  
  // Switching off action
  'action.switching_off.no_target': 'Switch off what?',
  'action.switching_off.not_switchable': "{item} can't be switched off.",
  'action.switching_off.already_off': "{item} is already off.",
  'action.switching_off.not_accessible': "You can't reach {item}.",
  
  // Container messages (used by multiple actions)
  'container.closed': '{container} is closed.',
  'container.empty': '{container} is empty.',
  'container.contents': 'Inside {container} you can see: {contents}.',
  'container.full': '{container} is full.',
};
