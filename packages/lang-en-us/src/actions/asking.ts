/**
 * Language content for asking action
 */

export const askingLanguage = {
  actionId: 'if.action.asking',
  
  patterns: [
    'ask [someone] about [topic]',
    'question [someone] about [topic]',
    'inquire of [someone] about [topic]'
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
    'unknown_topic': "{capitalize the target} {verb:says target}, \"I don't know anything about that.\"",
    'shrugs': "{capitalize the target} shrugs.",
    'no_idea': "{capitalize the target} {verb:says target}, \"No idea what you're talking about.\"",
    'confused': "{capitalize the target} looks confused.",

    // Success messages - known topic
    'responds': "{capitalize the target} {verb:tells target} you about {verbatim:topic}.",
    'explains': "{capitalize the target} {verb:explains target} about {verbatim:topic}.",
    'already_told': "{capitalize the target} {verb:says target}, \"I already told you about that.\"",
    'remembers': "{capitalize the target} {verb:says target}, \"Ah yes, about {verbatim:topic}...\"",

    // Success messages - conditional responses
    'not_yet': "{capitalize the target} {verb:says target}, \"I can't tell you about that yet.\"",
    'must_do_first': "{capitalize the target} {verb:says target}, \"There's something you need to do first.\"",
    'earned_trust': "{capitalize the target} {verb:says target}, \"Since you've proven yourself, I'll tell you...\""
  },
  
  help: {
    description: 'Ask characters about specific topics to gather information.',
    examples: 'ask guard about castle, ask wizard about magic, question merchant about prices',
    summary: 'ASK ABOUT - Ask characters about specific topics to gather information. Example: ASK GUARD ABOUT CASTLE'
  }
};
