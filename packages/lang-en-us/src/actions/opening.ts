/**
 * English language content for the opening action
 */

export const openingLanguage = {
  actionId: 'if.action.opening',
  
  patterns: [
    'open [something]',
    'open up [something]',
    'unclose [something]'
  ],
  
  messages: {
    'no_target': "Open what?",
    'not_openable': "{item} can't be opened.",
    'already_open': "{item} is already open.",
    'locked': "{item} is locked.",
    'opened': "{You} {open} {item}.",
    'revealing': "Opening {container} reveals {items}.",
    'its_empty': "{You} {open} {container}, which is empty.",
    'cant_reach': "{You} {can't} reach {item}."
  },
  
  help: {
    description: 'Open containers or doors.',
    examples: 'open door, open box, open chest',
    summary: 'OPEN - Open doors, containers, and other openable objects. Example: OPEN DOOR'
  }
};