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
    'not_visible': "{You} {can't} see {the:target}.",
    'too_far': "{the:cap:target} is too far away.",
    'not_actor': "{You} can only tell things to people.",

    // Success messages - general. Mid-sentence positions use {the:target}
    // so proper-named NPCs render without an article.
    'told': "{You} {tell} {the:target} about {topic}.",
    'informed': "{You} {inform} {the:target} about {topic}.",

    // Responses - interested
    'interested': "{the:cap:target} listens with interest.",
    'very_interested': "{the:cap:target} says, \"Really? Tell me more!\"",
    'grateful': "{the:cap:target} says, \"Thank you for telling me!\"",
    'already_knew': "{the:cap:target} says, \"Yes, I'm aware of that.\"",

    // Responses - not interested
    'not_interested': "{the:cap:target} doesn't seem interested.",
    'bored': "{the:cap:target} looks bored.",
    'dismissive': "{the:cap:target} says, \"So what?\"",
    'ignores': "{the:cap:target} ignores what {you're} saying."
  },
  
  help: {
    description: 'Tell characters about topics or give them information.',
    examples: 'tell guard about thief, inform king about danger, notify wizard about discovery',
    summary: 'TELL ABOUT - Tell characters about topics or give them information. Example: TELL ALICE ABOUT KEY'
  }
};
