/**
 * Standard response templates
 * TODO: Move these to proper language provider
 */

export const StandardResponses = {
  // Taking action messages
  'action.taking.no_target': 'Take what?',
  'action.taking.cant_take_self': "You can't take yourself.",
  'action.taking.already_held': "You're already carrying {item}.",
  'action.taking.not_takeable': "{item} can't be taken.",
  'action.taking.cant_take_location': "You can't take the entire location!",
  'action.taking.not_accessible': "You can't reach {item}.",
  'action.taking.item_not_found': "That item doesn't seem to be anywhere.",
  'action.taking.success': 'Taken.',
  
  // Dropping action messages
  'action.dropping.no_target': 'Drop what?',
  'action.dropping.not_held': "You're not carrying {item}.",
  'action.dropping.not_droppable': "You can't drop {item}.",
  'action.dropping.success': 'Dropped.',
  
  // Examining action messages
  'action.examining.no_target': 'Examine what?',
  'action.examining.not_visible': "You can't see {item} here.",
  'action.examining.no_description': 'You see nothing special about {item}.',
  'action.examining.container_closed': '{container} is closed.',
  'action.examining.container_empty': '{container} is empty.',
  'action.examining.container_contents': 'Inside {container} you can see: {contents}.',
  
  // Going action messages
  'action.going.no_direction': 'Go where?',
  'action.going.not_a_direction': "You can't go {direction}.",
  'action.going.no_exit': "You can't go {direction}.",
  'action.going.exit_blocked': "You can't go {direction} right now.",
  'action.going.door_closed': 'The {door} is closed.',
  'action.going.destination_error': "Something went wrong - the destination doesn't exist.",
  'action.going.you_can_see': 'You can see: {items}.',
  'action.going.exits_label': 'Exits: {exits}',
  
  // Opening action messages
  'action.opening.no_target': 'Open what?',
  'action.opening.not_openable': "{item} can't be opened.",
  'action.opening.already_open': '{item} is already open.',
  'action.opening.locked': '{item} is locked.',
  'action.opening.success': 'Opened.',
  
  // Closing action messages
  'action.closing.no_target': 'Close what?',
  'action.closing.not_closable': "{item} can't be closed.",
  'action.closing.already_closed': '{item} is already closed.',
  'action.closing.success': 'Closed.',
  
  // Inventory messages
  'action.inventory.empty': "You're not carrying anything.",
  'action.inventory.carrying': "You're carrying:",
  
  // Generic messages
  'generic.cant_see': "You can't see {item}.",
  'generic.nothing_special': 'You see nothing special.',
  'generic.inside_is': 'Inside is {contents}.',
  'generic.it_is_closed': 'It is closed.',
  'generic.it_is_empty': 'It is empty.'
};
