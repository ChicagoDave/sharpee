/**
 * English language content for the opening action
 */

export const openingLanguage = {
  actionId: 'if.action.opening',
  
  patterns: [
    'open [something]',
    'open up [something]',
    'open [something] with [something]'
  ],
  
  messages: {
    'no_target': "Open what?",
    'not_openable': "{capitalize the item} can't be opened.",
    'already_open': "{capitalize the item} {verb:is item} already open.",
    'locked': "{capitalize the item} {verb:is item} locked.",
    'opened': "{You} {open} {the item}.",
    'revealing': "Opening {the container} reveals {items}.",
    'its_empty': "{You} {open} {the container}, which is empty.",
    'cant_reach': "{You} {can't} reach {the item}.",
    'no_tool': "{You} {need} something to open {the item} with.",
    'tool_not_held': "{You} {need} to be holding {the tool}.",
    'wrong_tool': "{capitalize the tool} won't open {the item}."
  },
  
  help: {
    description: 'Open containers or doors.',
    examples: 'open door, open box, open chest',
    summary: 'OPEN - Open doors, containers, and other openable objects. Example: OPEN DOOR'
  }
};