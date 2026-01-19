/**
 * English language content for the looking action
 */

export const lookingLanguage = {
  actionId: 'if.action.looking',
  
  patterns: [
    'look',
    'l',
    'look around',
    'look at [something]',
    'examine [something]',
    'x [something]'
  ],
  
  messages: {
    // Note: room_description is empty because if.event.room.description already outputs the room
    // via the text service's room handler. This message ID exists for completeness but should not
    // duplicate the room description output.
    'room_description': "",
    'room_dark': "It's pitch dark, and {you} {can't} see a thing.",
    'exits': "Exits: {exits}",
    'you_see': "{You} can {see} {items} here.",
    'contents_list': "{You} can {see} {items} here.",
    'nothing_special': "{You} {see} nothing special.",
    'container_contents': "In {container} {you} {see} {items}.",
    'surface_contents': "On {surface} {you} {see} {items}."
  },
  
  help: {
    description: 'Look around the current location to see what is there.',
    examples: 'look, l, look around',
    summary: 'LOOK/L - Look around the current location to see what is there. Example: LOOK'
  }
};