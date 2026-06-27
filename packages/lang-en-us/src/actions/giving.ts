/**
 * Language content for giving action
 */

export const givingLanguage = {
  actionId: 'if.action.giving',
  
  patterns: [
    'give [something] to [someone]',
    'give [someone] [something]',
    'offer [something] to [someone]',
    'offer [someone] [something]',
    'hand [something] to [someone]',
    'hand [someone] [something]',
    'present [something] to [someone]',
    'present [someone] [something]'
  ],
  
  messages: {
    // Error messages
    'no_item': "Give what?",
    'no_recipient': "Give it to whom?",
    'not_holding': "{You} aren't holding {the item}.",
    'recipient_not_visible': "{You} {can't} see {the recipient}.",
    'recipient_not_reachable': "{capitalize the recipient} {verb:is recipient} too far away.",
    'not_actor': "{You} can only give things to people.",
    'self': "{You} already {have} {the item}!",

    // Refusal messages
    'inventory_full': "{capitalize the recipient} says, \"I can't carry any more.\"",
    'too_heavy': "{capitalize the recipient} says, \"That's too heavy for me.\"",
    'not_interested': "{capitalize the recipient} doesn't seem interested in {the item}.",
    'refuses': "{capitalize the recipient} politely declines.",

    // Success messages
    'given': "{You} {give} {the item} to {the recipient}.",
    'accepts': "{capitalize the recipient} accepts {the item}.",
    'gratefully_accepts': "{capitalize the recipient} gratefully accepts {the item}.",
    'reluctantly_accepts': "{capitalize the recipient} reluctantly takes {the item}."
  },
  
  help: {
    description: 'Give objects to other characters.',
    examples: 'give sword to knight, give Bob the key, offer flower to princess',
    summary: 'GIVE TO - Give objects to other characters. Example: GIVE FLOWER TO ALICE'
  }
};
