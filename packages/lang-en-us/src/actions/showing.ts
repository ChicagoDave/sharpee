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
    'not_carrying': "You aren't carrying {item}.",
    'viewer_not_visible': "You can't see {viewer}.",
    'viewer_too_far': "{viewer} is too far away to see clearly.",
    'not_actor': "You can only show things to people.",
    'self': "You examine {item} closely.",
    
    // Success messages
    'shown': "You show {item} to {viewer}.",
    'viewer_examines': "{viewer} examines {item} carefully.",
    'viewer_nods': "{viewer} nods.",
    'viewer_impressed': "{viewer} looks impressed.",
    'viewer_unimpressed': "{viewer} seems unimpressed.",
    'viewer_recognizes': "{viewer} recognizes {item}!",
    'wearing_shown': "You show {viewer} that you're wearing {item}."
  },
  
  help: {
    description: 'Show objects to other characters without giving them away.',
    examples: 'show badge to guard, show merchant the gem, display painting to curator',
    summary: 'SHOW TO - Show objects to other characters. Example: SHOW BADGE TO GUARD'
  }
};
