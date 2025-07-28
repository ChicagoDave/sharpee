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
    'no_destination': "Where do you want to put {item}?",
    'not_held': "You need to be holding {item} first.",
    'not_container': "You can't put things in {destination}.",
    'not_surface': "You can't put things on {destination}.",
    'container_closed': "{container} is closed.",
    'already_there': "{item} is already {relation} {destination}.",
    'put_in': "You put {item} in {container}.",
    'put_on': "You put {item} on {surface}.",
    'cant_put_in_itself': "You can't put {item} inside itself.",
    'cant_put_on_itself': "You can't put {item} on itself.",
    'no_room': "There's no room in {container}.",
    'no_space': "There's no space on {surface}."
  },
  
  help: {
    description: 'Put objects in or on other objects.',
    examples: 'put book in box, put lamp on table, place key in drawer',
    summary: 'PUT ON/IN - Place objects on surfaces or in containers. Example: PUT VASE ON TABLE'
  }
};