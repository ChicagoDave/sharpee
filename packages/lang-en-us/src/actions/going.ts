/**
 * English language content for the going action
 */

export const goingLanguage = {
  actionId: 'if.action.going',
  
  patterns: [
    'go [direction]',
    '[direction]',
    'walk [direction]',
    'head [direction]',
    'move [direction]',
    'travel [direction]'
  ],
  
  messages: {
    'contents_list': "{You} can {see} {items} here.",
    'no_exit': "{You} {can't} go that way.",
    'no_exit_that_way': "{You} {can't} go that way.",
    'door_closed': "The {door} is closed.",
    'door_locked': "The {door} is locked.",
    'too_dark': "It's too dark to navigate safely.",
    'moved': "{You} {go} {direction}.",
    'cant_go_through': "{You} {can't} go through {obstacle}.",
    'already_there': "{You're} already there.",
    'nowhere_to_go': "{You}'ll have to say which compass direction to go in.",
    'no_direction': "{You}'ll have to say which direction to go.",
    'not_in_room': "{You're} not in a place where {you} can go anywhere.",
    'no_exits': "There are no obvious exits.",
    'movement_blocked': "{message}",
    'destination_not_found': "{You} {can't} go that way.",
    'need_light': "It's too dark to go that way safely.",
    'went': "{You} {go} {direction}.",
    'arrived': "{You} {arrive}.",
    'cant_go': "{You} {can't} go that way."
  },
  
  help: {
    description: 'Move in compass directions or to connected locations.',
    examples: 'go north, n, walk east, head south, go upstairs',
    summary: 'GO/N/S/E/W - Move in compass directions or to connected locations. Example: GO NORTH or N'
  }
};