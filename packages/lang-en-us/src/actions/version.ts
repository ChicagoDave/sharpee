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
    'version_full': "{verbatim:storyTitle} v{verbatim:storyVersion}\nSharpee Engine v{verbatim:engineVersion}\nBuilt: {buildDate}",

    // Without build date
    'version_no_date': "{verbatim:storyTitle} v{verbatim:storyVersion}\nSharpee Engine v{verbatim:engineVersion}",

    // Compact version
    'version_compact': "{verbatim:storyTitle} v{verbatim:storyVersion} (Sharpee v{verbatim:engineVersion})"
  },

  help: {
    description: 'Display version information about the game and engine.',
    examples: 'version',
    summary: 'VERSION - Display version information about the game and engine. Example: VERSION'
  }
};
