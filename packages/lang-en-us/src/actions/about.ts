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
