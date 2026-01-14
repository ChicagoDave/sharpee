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
    'not_holding': "{You} aren't holding {item}.",
    'recipient_not_visible': "{You} {can't} see {recipient}.",
    'recipient_not_reachable': "{recipient} is too far away.",
    'not_actor': "{You} can only give things to people.",
    'self': "{You} already {have} {item}!",

    // Refusal messages
    'inventory_full': "{recipient} says, \"I can't carry any more.\"",
    'too_heavy': "{recipient} says, \"That's too heavy for me.\"",
    'not_interested': "{recipient} doesn't seem interested in {item}.",
    'refuses': "{recipient} politely declines.",

    // Success messages
    'given': "{You} {give} {item} to {recipient}.",
    'accepts': "{recipient} accepts {item}.",
    'gratefully_accepts': "{recipient} gratefully accepts {item}.",
    'reluctantly_accepts': "{recipient} reluctantly takes {item}."
  },
  
  help: {
    description: 'Give objects to other characters.',
    examples: 'give sword to knight, give Bob the key, offer flower to princess',
    summary: 'GIVE TO - Give objects to other characters. Example: GIVE FLOWER TO ALICE'
  }
};
