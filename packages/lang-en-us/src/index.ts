/**
 * @file English Language Plugin for Sharpee
 * @description Exports the English (US) language plugin
 */

import { EnglishLanguagePlugin } from './english-plugin';

// Export the plugin class as default
export default EnglishLanguagePlugin;

// Also export named exports for flexibility
export { EnglishLanguagePlugin, createEnglishLanguage } from './english-plugin';
export { EnglishParser, createEnglishParser } from './parser';

// Export data for those who want to extend or customize
export { englishVerbs } from './data/verbs';
export { englishTemplates } from './data/templates';
export { englishWords, irregularPlurals, abbreviations } from './data/words';
export { failureMessages, systemMessages } from './data/messages';
export { eventMessages, eventMessageFunctions } from './data/events';
