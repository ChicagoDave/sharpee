/**
 * English language content for the putting action
 */

export const puttingLanguage = {
  actionId: 'if.action.putting',
  
  patterns: [
    'put [something] in [something]',
    'put [something] into [something]',
    'put [something] on [something]',
    'put [something] onto [something]',
    'place [something] in [something]',
    'place [something] on [something]',
    'insert [something] in [something]',
    'insert [something] into [something]'
  ],
  
  messages: {
    'no_target': "Put what?",
    'no_destination': "Where do {you} want to put {the:item}?",
    'not_held': "{You} {need} to be holding {the:item} first.",
    'not_container': "{You} {can't} put things in {the:destination}.",
    'not_surface': "{You} {can't} put things on {the:destination}.",
    'container_closed': "{the:cap:container} is closed.",
    'already_there': "{the:cap:item} is already {relation} {the:destination}.",
    'put_in': "{You} {put} {the:item} in {the:container}.",
    'put_on': "{You} {put} {the:item} on {the:surface}.",
    'cant_put_in_itself': "{You} {can't} put {the:item} inside itself.",
    'cant_put_on_itself': "{You} {can't} put {the:item} on itself.",
    'no_room': "There's no room in {the:container}.",
    'no_space': "There's no space on {the:surface}."
  },
  
  help: {
    description: 'Put objects in or on other objects.',
    examples: 'put book in box, put lamp on table, place key in drawer',
    summary: 'PUT ON/IN - Place objects on surfaces or in containers. Example: PUT VASE ON TABLE'
  }
};