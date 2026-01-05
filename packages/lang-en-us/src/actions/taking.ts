/**
 * English language content for the taking action
 */

export const takingLanguage = {
  actionId: 'if.action.taking',
  
  patterns: [
    'take [something]',
    'get [something]',
    'pick up [something]',
    'grab [something]',
    'acquire [something]',
    'collect [something]'
  ],
  
  messages: {
    'no_target': "Take what?",
    'cant_take_self': "{You} {can't} take {yourself}.",
    'already_have': "{You} already {have} {item}.",
    'cant_take_room': "{You} {can't} take {item}.",
    'fixed_in_place': "{item} is fixed in place.",
    'container_full': "{You're} carrying too much already.",
    'too_heavy': "{item} is too heavy to carry.",
    'taken': "Taken.",
    'taken_from': "{You} {take} {item} from {container}."
  },
  
  help: {
    description: 'Pick up objects and add them to your inventory.',
    examples: 'take book, get lamp, pick up the key, grab sword',
    summary: 'TAKE/GET/PICK UP - Pick up objects and add them to your inventory. Example: TAKE LAMP'
  }
};