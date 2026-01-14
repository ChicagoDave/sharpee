/**
 * English language content for the removing action (from containers)
 * Note: This is different from taking off clothing
 */

export const removingLanguage = {
  actionId: 'if.action.removing',
  
  patterns: [
    'remove [something] from [something]',
    'take [something] from [something]',
    'take [something] out of [something]',
    'get [something] from [something]',
    'extract [something] from [something]'
  ],
  
  messages: {
    'no_target': "Remove what?",
    'no_source': "Remove {item} from what?",
    'not_in_container': "{item} isn't in {container}.",
    'not_on_surface': "{item} isn't on {surface}.",
    'container_closed': "{container} is closed.",
    'removed_from': "{You} {take} {item} from {container}.",
    'removed_from_surface': "{You} {take} {item} from {surface}.",
    'cant_reach': "{You} {can't} reach {item}.",
    'already_have': "{You} already {have} {item}."
  },
  
  help: {
    description: 'Remove objects from containers or surfaces.',
    examples: 'remove book from shelf, take coin from box, get apple from basket',
    summary: 'REMOVE/TAKE FROM - Take objects out of containers. Example: TAKE BOOK FROM SHELF'
  }
};