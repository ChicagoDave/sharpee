/**
 * Language content for telling action
 */

export const tellingLanguage = {
  actionId: 'if.action.telling',
  
  patterns: [
    'tell [someone] about [topic]',
    'inform [someone] about [topic]',
    'notify [someone] about [topic]',
    'say [topic] to [someone]'
  ],
  
  messages: {
    // Error messages
    'no_target': "Tell whom?",
    'no_topic': "Tell them about what?",
    'not_visible': "You can't see {target}.",
    'too_far': "{target} is too far away.",
    'not_actor': "You can only tell things to people.",
    
    // Success messages - general
    'told': "You tell {target} about {topic}.",
    'informed': "You inform {target} about {topic}.",
    
    // Responses - interested
    'interested': "{target} listens with interest.",
    'very_interested': "{target} says, \"Really? Tell me more!\"",
    'grateful': "{target} says, \"Thank you for telling me!\"",
    'already_knew': "{target} says, \"Yes, I'm aware of that.\"",
    
    // Responses - not interested
    'not_interested': "{target} doesn't seem interested.",
    'bored': "{target} looks bored.",
    'dismissive': "{target} says, \"So what?\"",
    'ignores': "{target} ignores what you're saying."
  },
  
  help: {
    description: 'Tell characters about topics or give them information.',
    examples: 'tell guard about thief, inform king about danger, notify wizard about discovery',
    summary: 'TELL ABOUT - Tell characters about topics or give them information. Example: TELL ALICE ABOUT KEY'
  }
};
