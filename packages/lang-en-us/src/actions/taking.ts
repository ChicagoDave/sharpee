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
    'already_have': "{You} already {have} {the:item}.",
    'cant_take_room': "{You} {can't} take {the:item}.",
    'fixed_in_place': "{the:cap:item} is fixed in place.",
    'container_full': "{You're} carrying too much already.",
    'too_heavy': "Your load is too heavy. You will have to leave something behind.",
    'cannot_take': "{You} {can't} take {the:item}.",
    'taken': "Taken.",
    'taken_from': "{You} {take} {the:item} from {the:container}.",
    // Multi-take label format: rendered without article per IF convention
    // ("brass lantern: Taken." not "The brass lantern: Taken.").
    // {item} with EntityInfo and no formatter renders value.name — backward compatible.
    'taken_multi': "{item}: Taken."
  },
  
  help: {
    description: 'Pick up objects and add them to your inventory.',
    examples: 'take book, get lamp, pick up the key, grab sword',
    summary: 'TAKE/GET/PICK UP - Pick up objects and add them to your inventory. Example: TAKE LAMP'
  }
};