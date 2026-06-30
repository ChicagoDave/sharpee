/**
 * Language content for talking action
 */

export const talkingLanguage = {
  actionId: 'if.action.talking',
  
  patterns: [
    'talk to [someone]',
    'talk [someone]',
    'speak to [someone]',
    'speak with [someone]',
    'greet [someone]',
    'say hello to [someone]',
    'chat with [someone]'
  ],
  
  messages: {
    // Error messages
    'no_target': "Talk to whom?",
    'not_visible': "{You} {can't} see {the target}.",
    'too_far': "{capitalize the target} {verb:is target} too far away for conversation.",
    'not_actor': "{You} can only talk to people.",
    'self': "Talking to {yourself} is a sign of madness.",
    'not_available': "{capitalize the target} doesn't want to talk right now.",

    // Success messages - general
    'talked': "{You} {greet} {the target}.",
    'no_response': "{capitalize the target} doesn't respond.",
    'acknowledges': "{capitalize the target} acknowledges {you}.",

    // Success messages - first meeting
    'first_meeting': "{You} {introduce} {yourself} to {the target}.",
    'greets_back': "{capitalize the target} {verb:says target}, \"Hello there!\"",
    'formal_greeting': "{capitalize the target} {verb:says target}, \"Good day to you.\"",
    'casual_greeting': "{capitalize the target} {verb:says target}, \"Hey!\"",

    // Success messages - subsequent meetings
    'greets_again': "{capitalize the target} {verb:says target}, \"Hello again.\"",
    'remembers_you': "{capitalize the target} {verb:says target}, \"Ah, it's you again.\"",
    'friendly_greeting': "{capitalize the target} smiles in recognition.",

    // Success messages - with topics
    'has_topics': "{capitalize the target} seems willing to discuss various topics.",
    'nothing_to_say': "{capitalize the target} {verb:has target} nothing particular to say."
  },
  
  help: {
    description: 'Start a conversation with another character.',
    examples: 'talk to guard, greet merchant, speak with wizard, chat with innkeeper',
    summary: 'TALK TO - Start a conversation with another character. Example: TALK TO MERCHANT'
  }
};
