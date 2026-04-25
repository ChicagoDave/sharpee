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
    'no_destination': "Insert {the:item} into what?",
    'not_held': "{You} {need} to be holding {the:item} first.",
    'not_insertable': "{the:cap:item} can't be inserted into things.",
    'not_container': "{You} {can't} insert things into {the:destination}.",
    'already_there': "{the:cap:item} is already in {the:destination}.",
    'inserted': "{You} {insert} {the:item} into {the:container}.",
    'wont_fit': "{the:cap:item} won't fit in {the:container}.",
    'container_closed': "{the:cap:container} is closed."
  },
  
  help: {
    description: 'Insert objects into containers.',
    examples: 'insert coin in slot, insert key into lock',
    summary: 'INSERT/PUT IN - Put objects inside containers. Example: PUT COIN IN SLOT'
  }
};