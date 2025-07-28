/**
 * Language content for searching action
 */

export const searchingLanguage = {
  actionId: 'if.action.searching',
  
  patterns: [
    'search [something]',
    'look in [something]',
    'look inside [something]',
    'look through [something]',
    'rummage [something]',
    'rummage in [something]',
    'rummage through [something]',
    'examine [something] closely'
  ],
  
  messages: {
    // Error messages
    'not_visible': "You can't see {target} to search it.",
    'not_reachable': "You can't reach {target} to search it.",
    'container_closed': "{target} is closed.",
    
    // Success messages
    'nothing_special': "You find nothing of interest.",
    'found_items': "You discover: {items}.",
    'empty_container': "{target} is empty.",
    'container_contents': "In {target} you see: {items}.",
    'supporter_contents': "On {target} you see: {items}.",
    'searched_location': "You search around carefully.",
    'searched_object': "You search {target} thoroughly.",
    'found_concealed': "Hidden {where}, you discover: {items}."
  },
  
  help: {
    description: 'Search objects or locations for hidden items or additional details.',
    examples: 'search desk, look in drawer, rummage through bag, examine closely',
    summary: 'SEARCH/LOOK IN - Search objects or locations for hidden items or additional details. Example: SEARCH DESK'
  }
};
