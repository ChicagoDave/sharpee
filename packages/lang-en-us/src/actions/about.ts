/**
 * Language content for about action
 */

export const aboutLanguage = {
  actionId: 'if.action.about',
  
  patterns: [
    'about',
    'info',
    'credits'
  ],
  
  messages: {
    // Default ABOUT output — key matches the messageId the stdlib about
    // action emits (if.action.about.success). The action pulls the params
    // (title, author, version, description, ...) from the game's
    // StoryInfoTrait, so this renders real story data with no story-side
    // setup. Stories override by registering the same fully-qualified id:
    // language.addMessage('if.action.about.success', ...).
    'success': "{verbatim:title}\nVersion {verbatim:version}\nBy {verbatim:author}\n\n{verbatim:description}",

    // Header
    'about_header': "About {verbatim:title}",
    
    // Basic info
    'game_info': "{verbatim:title}\nVersion {verbatim:version}\nBy {verbatim:author}\nReleased: {releaseDate}",
    'game_info_simple': "{verbatim:title} by {verbatim:author}",
    
    // Extended info
    'description': "Description: {verbatim:description}",
    'copyright': "Copyright {copyright}",
    'license': "License: {license}",
    'website': "Website: {website}",
    'contact': "Contact: {contact}",
    
    // Credits
    'credits_header': "Credits:",
    'credits_list': "{credits}",
    'special_thanks': "Special Thanks: {specialThanks}",
    'dedication': "Dedication: {dedication}",
    'acknowledgments': "Acknowledgments: {acknowledgments}",
    
    // Technical info
    'engine_info': "Powered by {engine} version {verbatim:engineVersion}",
    'technical_info': "Technical Information:\nEngine: {engine} v{verbatim:engineVersion}\nPlatform: Interactive Fiction",
    
    // Play statistics
    'play_stats': "Current Session:\nTime played: {playTime}\nMoves made: {sessionMoves}",
    'session_info': "You've been playing for {playTime} and made {sessionMoves} moves.",
    
    // Footer
    'about_footer': "Thank you for playing!",
    'enjoy_game': "We hope you enjoy playing {verbatim:title}!",
    
    // Compact version
    'about_compact': "{verbatim:title} v{version} by {verbatim:author}"
  },
  
  help: {
    description: 'Display information about the game, including credits and version.',
    examples: 'about, info, credits',
    summary: 'ABOUT/INFO - Display information about the game, including credits and version. Example: ABOUT'
  }
};
