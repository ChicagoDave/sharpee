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
    'no_source': "Remove {the item} from what?",
    'not_in_container': "{capitalize the item} isn't in {the container}.",
    'not_on_surface': "{capitalize the item} isn't on {the surface}.",
    'container_closed': "{capitalize the container} {verb:is container} closed.",
    'removed_from': "{You} {take} {the item} from {the container}.",
    'removed_from_surface': "{You} {take} {the item} from {the surface}.",
    'cant_reach': "{You} {can't} reach {the item}.",
    'already_have': "{You} already {have} {the item}."
  },
  
  help: {
    description: 'Remove objects from containers or surfaces.',
    examples: 'remove book from shelf, take coin from box, get apple from basket',
    summary: 'REMOVE/TAKE FROM - Take objects out of containers. Example: TAKE BOOK FROM SHELF'
  }
};