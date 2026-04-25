/**
 * Language content for showing action
 */

export const showingLanguage = {
  actionId: 'if.action.showing',
  
  patterns: [
    'show [something] to [someone]',
    'show [someone] [something]',
    'display [something] to [someone]',
    'reveal [something] to [someone]',
    'present [something] to [someone]'
  ],
  
  messages: {
    // Error messages
    'no_item': "Show what?",
    'no_viewer': "Show it to whom?",
    'not_carrying': "{You} aren't carrying {the:item}.",
    'viewer_not_visible': "{You} {can't} see {the:viewer}.",
    'viewer_too_far': "{the:cap:viewer} is too far away to see clearly.",
    'not_actor': "{You} can only show things to people.",
    'self': "{You} {examine} {the:item} closely.",

    // Success messages
    'shown': "{You} {show} {the:item} to {the:viewer}.",
    'viewer_examines': "{the:cap:viewer} examines {the:item} carefully.",
    'viewer_nods': "{the:cap:viewer} nods.",
    'viewer_impressed': "{the:cap:viewer} looks impressed.",
    'viewer_unimpressed': "{the:cap:viewer} seems unimpressed.",
    'viewer_recognizes': "{the:cap:viewer} recognizes {the:item}!",
    'wearing_shown': "{You} {show} {the:viewer} that {you're} wearing {the:item}."
  },
  
  help: {
    description: 'Show objects to other characters without giving them away.',
    examples: 'show badge to guard, show merchant the gem, display painting to curator',
    summary: 'SHOW TO - Show objects to other characters. Example: SHOW BADGE TO GUARD'
  }
};
