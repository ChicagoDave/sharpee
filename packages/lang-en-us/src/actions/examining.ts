/**
 * English language content for the examining action
 */

export const examiningLanguage = {
  actionId: 'if.action.examining',
  
  patterns: [
    'examine [something]',
    'x [something]',
    'look at [something]',
    'inspect [something]',
    'study [something]',
    'read [something]'
  ],
  
  messages: {
    // Error messages
    'no_target': "Examine what?",
    'not_visible': "{You} {can't} see {the item} here.",
    'cant_see': "{You} {can't} see {the item} here.",

    // Success messages - these match stdlib's ExaminingMessages
    'examined': "{verbatim:description}",
    'examined_self': "{verbatim:description}",
    'examined_container': "{verbatim:description}",
    'examined_supporter': "{verbatim:description}",
    'examined_readable': "{verbatim:description}",
    'examined_switchable': "{verbatim:description}",
    'examined_wearable': "{verbatim:description}",
    'examined_door': "{verbatim:description}",
    'examined_wall': "{verbatim:description}",
    'nothing_special': "{You} {see} nothing special about {the item}.",
    'description': "{verbatim:description}",
    'brief_description': "{verbatim:description}",
    'no_description': "{You} {see} nothing special about {the item}.",

    // Legacy messages for compatibility
    'container_open': "{capitalize the item} {verb:is item} open.",
    'container_closed': "{capitalize the item} {verb:is item} closed.",
    'container_empty': "{capitalize the item} {verb:is item} empty.",
    'container_contents': "In {the container} {you} {see} {items}.",
    'surface_contents': "On {the surface} {you} {see} {items}.",
    'worn_by_you': "{You} {are} wearing {the item}.",
    'worn_by_other': "{actor} {verb:is actor} wearing {the item}."
  },
  
  help: {
    description: 'Examine objects more closely.',
    examples: 'examine book, x lamp, look at key, inspect door',
    summary: 'EXAMINE/X/LOOK AT - Look closely at objects to see detailed descriptions. Example: X BOOK'
  }
};