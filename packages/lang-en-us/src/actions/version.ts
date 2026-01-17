/**
 * Language content for version action
 */

export const versionLanguage = {
  actionId: 'if.action.version',

  patterns: [
    'version'
  ],

  messages: {
    // Full version display
    'version_full': "{storyTitle} v{storyVersion}\nSharpee Engine v{engineVersion}\nBuilt: {buildDate}",

    // Without build date
    'version_no_date': "{storyTitle} v{storyVersion}\nSharpee Engine v{engineVersion}",

    // Compact version
    'version_compact': "{storyTitle} v{storyVersion} (Sharpee v{engineVersion})"
  },

  help: {
    description: 'Display version information about the game and engine.',
    examples: 'version',
    summary: 'VERSION - Display version information about the game and engine. Example: VERSION'
  }
};
