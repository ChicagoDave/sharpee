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
    'not_visible': "{You} {can't} see {the target}.",
    'too_far': "{capitalize the target} {verb:is target} too far away.",
    'not_actor': "{You} can only ask questions of people.",

    // Sentence-start NPC references use {capitalize the target} so proper-named
    // NPCs render without article ("Floyd", not "The Floyd").

    // Success messages - unknown topic
    'unknown_topic': "{capitalize the target} says, \"I don't know anything about that.\"",
    'shrugs': "{capitalize the target} shrugs.",
    'no_idea': "{capitalize the target} says, \"No idea what you're talking about.\"",
    'confused': "{capitalize the target} looks confused.",

    // Success messages - known topic
    'responds': "{capitalize the target} tells you about {verbatim:topic}.",
    'explains': "{capitalize the target} explains about {verbatim:topic}.",
    'already_told': "{capitalize the target} says, \"I already told you about that.\"",
    'remembers': "{capitalize the target} says, \"Ah yes, about {verbatim:topic}...\"",

    // Success messages - conditional responses
    'not_yet': "{capitalize the target} says, \"I can't tell you about that yet.\"",
    'must_do_first': "{capitalize the target} says, \"There's something you need to do first.\"",
    'earned_trust': "{capitalize the target} says, \"Since you've proven yourself, I'll tell you...\""
  },
  
  help: {
    description: 'Ask characters about specific topics to gather information.',
    examples: 'ask guard about castle, ask wizard about magic, question merchant about prices',
    summary: 'ASK ABOUT - Ask characters about specific topics to gather information. Example: ASK GUARD ABOUT CASTLE'
  }
};
