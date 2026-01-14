/**
 * Language content for asking action
 */

export const askingLanguage = {
  actionId: 'if.action.asking',
  
  patterns: [
    'ask [someone] about [topic]',
    'ask [someone] for [topic]',
    'question [someone] about [topic]',
    'inquire [someone] about [topic]',
    'query [someone] about [topic]'
  ],
  
  messages: {
    // Error messages
    'no_target': "Ask whom?",
    'no_topic': "Ask about what?",
    'not_visible': "{You} {can't} see {target}.",
    'too_far': "{target} is too far away.",
    'not_actor': "{You} can only ask questions of people.",
    
    // Success messages - unknown topic
    'unknown_topic': "{target} says, \"I don't know anything about that.\"",
    'shrugs': "{target} shrugs.",
    'no_idea': "{target} says, \"No idea what you're talking about.\"",
    'confused': "{target} looks confused.",
    
    // Success messages - known topic
    'responds': "{target} tells you about {topic}.",
    'explains': "{target} explains about {topic}.",
    'already_told': "{target} says, \"I already told you about that.\"",
    'remembers': "{target} says, \"Ah yes, about {topic}...\"",
    
    // Success messages - conditional responses
    'not_yet': "{target} says, \"I can't tell you about that yet.\"",
    'must_do_first': "{target} says, \"There's something you need to do first.\"",
    'earned_trust': "{target} says, \"Since you've proven yourself, I'll tell you...\""
  },
  
  help: {
    description: 'Ask characters about specific topics to gather information.',
    examples: 'ask guard about castle, ask wizard about magic, question merchant about prices',
    summary: 'ASK ABOUT - Ask characters about specific topics to gather information. Example: ASK GUARD ABOUT CASTLE'
  }
};
