/**
 * English language content for the inserting action
 * Note: This is often combined with putting, but can be separate for specific use cases
 */

export const insertingLanguage = {
  actionId: 'if.action.inserting',
  
  patterns: [
    'insert [something] in [something]',
    'insert [something] into [something]',
    'stick [something] in [something]',
    'push [something] in [something]'
  ],
  
  messages: {
    'no_target': "Insert what?",
    'no_destination': "Insert {item} into what?",
    'not_held': "{You} {need} to be holding {item} first.",
    'not_insertable': "{item} can't be inserted into things.",
    'not_container': "{You} {can't} insert things into {destination}.",
    'already_there': "{item} is already in {destination}.",
    'inserted': "{You} {insert} {item} into {container}.",
    'wont_fit': "{item} won't fit in {container}.",
    'container_closed': "{container} is closed."
  },
  
  help: {
    description: 'Insert objects into containers.',
    examples: 'insert coin in slot, insert key into lock',
    summary: 'INSERT/PUT IN - Put objects inside containers. Example: PUT COIN IN SLOT'
  }
};