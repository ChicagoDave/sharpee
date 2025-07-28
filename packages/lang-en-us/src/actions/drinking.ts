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
    'not_visible': "You can't see {item}.",
    'not_reachable': "You can't reach {item}.",
    'not_drinkable': "That's not something you can drink.",
    'already_consumed': "There's nothing left to drink.",
    'container_closed': "You need to open {item} first.",
    
    // Success messages - basic
    'drunk': "You drink {item}.",
    'drunk_all': "You drink all of {item}.",
    'drunk_some': "You drink some of {item}.",
    'drunk_from': "You drink from {item}.",
    
    // Success messages - quality
    'refreshing': "You drink {item}. How refreshing!",
    'satisfying': "You drink {item}. That hits the spot.",
    'bitter': "You drink {item}. It's quite bitter.",
    'sweet': "You drink {item}. It's sweet.",
    'strong': "You drink {item}. It's strong!",
    
    // Success messages - effects
    'thirst_quenched': "You drink {item}. Your thirst is quenched.",
    'still_thirsty': "You drink {item}, but you're still thirsty.",
    'magical_effects': "You drink {item}. You feel strange...",
    'healing': "You drink {item}. You feel better!",
    
    // Success messages - container
    'from_container': "You drink the {liquidType} from {item}.",
    'empty_now': "You drink the last of the {liquidType}.",
    'some_remains': "You drink some {liquidType}. Some remains.",
    
    // Success messages - special
    'sipped': "You take a sip of {item}.",
    'quaffed': "You quaff {item} heartily.",
    'gulped': "You gulp down {item}."
  },
  
  help: {
    description: 'Drink liquids to quench thirst or gain effects.',
    examples: 'drink water, sip wine, drink from fountain, quaff potion',
    summary: 'DRINK - Drink liquids to quench thirst or gain effects. Example: DRINK WATER'
  }
};
