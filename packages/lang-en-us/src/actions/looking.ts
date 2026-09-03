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
    // Room description - rendered via action.success (if.event.room.description is suppressed)
    'room_description': "{name}\n{verbatim:description}",
    // GH #108: keys the action emits that had no English. Brief mode shows
    // the name alone (VERBOSE/BRIEF, ADR-225); the container/supporter forms
    // are the look from inside or atop something that hides the room; an
    // objectless `examine` reads as a look.
    'room_description_brief': "{name}",
    'in_container': "{You} {be} in {the container}.",
    'on_supporter': "{You} {be} on {the supporter}.",
    'examine_surroundings': "{name}\n{verbatim:description}",
    'hidden_at': "({You're} hiding {verbatim:position} {the spot}.)",
    'room_dark': "It's pitch dark, and {you} {can't} see a thing.",
    'exits': "Exits: {exits}",
    'you_see': "{You} can {see} {items} here.",
    'contents_list': "{You} can {see} {items} here.",
    'nothing_special': "{You} {see} nothing special.",
    'container_contents': "In {the container} {you} {see} {items}.",
    'surface_contents': "On {the surface} {you} {see} {items}."
  },
  
  help: {
    description: 'Look around the current location to see what is there.',
    examples: 'look, l, look around',
    summary: 'LOOK/L - Look around the current location to see what is there. Example: LOOK'
  }
};