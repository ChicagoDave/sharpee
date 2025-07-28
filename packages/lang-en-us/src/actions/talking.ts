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
    'not_visible': "You can't see {target}.",
    'too_far': "{target} is too far away for conversation.",
    'not_actor': "You can only talk to people.",
    'self': "Talking to yourself is a sign of madness.",
    'not_available': "{target} doesn't want to talk right now.",
    
    // Success messages - general
    'talked': "You greet {target}.",
    'no_response': "{target} doesn't respond.",
    'acknowledges': "{target} acknowledges you.",
    
    // Success messages - first meeting
    'first_meeting': "You introduce yourself to {target}.",
    'greets_back': "{target} says, \"Hello there!\"",
    'formal_greeting': "{target} says, \"Good day to you.\"",
    'casual_greeting': "{target} says, \"Hey!\"",
    
    // Success messages - subsequent meetings
    'greets_again': "{target} says, \"Hello again.\"",
    'remembers_you': "{target} says, \"Ah, it's you again.\"",
    'friendly_greeting': "{target} smiles in recognition.",
    
    // Success messages - with topics
    'has_topics': "{target} seems willing to discuss various topics.",
    'nothing_to_say': "{target} has nothing particular to say."
  },
  
  help: {
    description: 'Start a conversation with another character.',
    examples: 'talk to guard, greet merchant, speak with wizard, chat with innkeeper',
    summary: 'TALK TO - Start a conversation with another character. Example: TALK TO MERCHANT'
  }
};
