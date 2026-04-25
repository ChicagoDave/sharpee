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
    'not_visible': "{You} {can't} see {the:target}.",
    'too_far': "{the:cap:target} is too far away.",
    'not_actor': "{You} can only ask questions of people.",

    // Sentence-start NPC references use {the:cap:target} so proper-named
    // NPCs render without article ("Floyd", not "The Floyd").

    // Success messages - unknown topic
    'unknown_topic': "{the:cap:target} says, \"I don't know anything about that.\"",
    'shrugs': "{the:cap:target} shrugs.",
    'no_idea': "{the:cap:target} says, \"No idea what you're talking about.\"",
    'confused': "{the:cap:target} looks confused.",

    // Success messages - known topic
    'responds': "{the:cap:target} tells you about {topic}.",
    'explains': "{the:cap:target} explains about {topic}.",
    'already_told': "{the:cap:target} says, \"I already told you about that.\"",
    'remembers': "{the:cap:target} says, \"Ah yes, about {topic}...\"",

    // Success messages - conditional responses
    'not_yet': "{the:cap:target} says, \"I can't tell you about that yet.\"",
    'must_do_first': "{the:cap:target} says, \"There's something you need to do first.\"",
    'earned_trust': "{the:cap:target} says, \"Since you've proven yourself, I'll tell you...\""
  },
  
  help: {
    description: 'Ask characters about specific topics to gather information.',
    examples: 'ask guard about castle, ask wizard about magic, question merchant about prices',
    summary: 'ASK ABOUT - Ask characters about specific topics to gather information. Example: ASK GUARD ABOUT CASTLE'
  }
};
