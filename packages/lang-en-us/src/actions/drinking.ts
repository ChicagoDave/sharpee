/**
 * Language content for drinking action
 */

export const drinkingLanguage = {
  actionId: 'if.action.drinking',
  
  patterns: [
    'drink [something]',
    'drink from [something]',
    'sip [something]',
    'sip from [something]',
    'quaff [something]',
    'imbibe [something]',
    'swallow [something]'
  ],
  
  messages: {
    // Error messages
    'no_item': "Drink what?",
    'not_visible': "{You} {can't} see {the:item}.",
    'not_reachable': "{You} {can't} reach {the:item}.",
    'not_drinkable': "That's not something {you} can drink.",
    'already_consumed': "There's nothing left to drink.",
    'container_closed': "{You} {need} to open {the:item} first.",

    // Success messages - basic
    'drunk': "{You} {drink} {the:item}.",
    'drunk_all': "{You} {drink} all of {the:item}.",
    'drunk_some': "{You} {drink} some of {the:item}.",
    'drunk_from': "{You} {drink} from {the:item}.",

    // Success messages - quality
    'refreshing': "{You} {drink} {the:item}. How refreshing!",
    'satisfying': "{You} {drink} {the:item}. That hits the spot.",
    'bitter': "{You} {drink} {the:item}. It's quite bitter.",
    'sweet': "{You} {drink} {the:item}. It's sweet.",
    'strong': "{You} {drink} {the:item}. It's strong!",

    // Success messages - effects
    'thirst_quenched': "{You} {drink} {the:item}. {Your} thirst is quenched.",
    'still_thirsty': "{You} {drink} {the:item}, but {you're} still thirsty.",
    'magical_effects': "{You} {drink} {the:item}. {You} {feel} strange...",
    'healing': "{You} {drink} {the:item}. {You} {feel} better!",

    // Success messages - container
    'from_container': "{You} {drink} the {liquidType} from {the:item}.",
    'empty_now': "{You} {drink} the last of the {liquidType}.",
    'some_remains': "{You} {drink} some {liquidType}. Some remains.",

    // Success messages - special
    'sipped': "{You} {take} a sip of {the:item}.",
    'quaffed': "{You} {quaff} {the:item} heartily.",
    'gulped': "{You} {gulp} down {the:item}."
  },
  
  help: {
    description: 'Drink liquids to quench thirst or gain effects.',
    examples: 'drink water, sip wine, drink from fountain, quaff potion',
    summary: 'DRINK - Drink liquids to quench thirst or gain effects. Example: DRINK WATER'
  }
};
