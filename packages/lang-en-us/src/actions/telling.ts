/**
 * Language content for telling action
 */

export const tellingLanguage = {
  actionId: 'if.action.telling',
  
  patterns: [
    'tell [someone] about [topic]',
    'inform [someone] about [topic]'
  ],
  
  messages: {
    // Error messages
    'no_target': "Tell whom?",
    'no_topic': "Tell them about what?",
    'not_visible': "{You} {can't} see {the target}.",
    'too_far': "{capitalize the target} {verb:is target} too far away.",
    'not_actor': "{You} can only tell things to people.",

    // Success messages - general. Mid-sentence positions use {the target}
    // so proper-named NPCs render without an article.
    'told': "{You} {tell} {the target} about {verbatim:topic}.",
    'informed': "{You} {inform} {the target} about {verbatim:topic}.",

    // Responses - interested
    'interested': "{capitalize the target} listens with interest.",
    'very_interested': "{capitalize the target} {verb:says target}, \"Really? Tell me more!\"",
    'grateful': "{capitalize the target} {verb:says target}, \"Thank you for telling me!\"",
    'already_knew': "{capitalize the target} {verb:says target}, \"Yes, I'm aware of that.\"",

    // Responses - not interested
    'not_interested': "{capitalize the target} doesn't seem interested.",
    'bored': "{capitalize the target} looks bored.",
    'dismissive': "{capitalize the target} {verb:says target}, \"So what?\"",
    'ignores': "{capitalize the target} ignores what {you're} saying."
  },
  
  help: {
    description: 'Tell characters about topics or give them information.',
    examples: 'tell guard about thief, inform king about danger, notify wizard about discovery',
    summary: 'TELL ABOUT - Tell characters about topics or give them information. Example: TELL ALICE ABOUT KEY'
  }
};
