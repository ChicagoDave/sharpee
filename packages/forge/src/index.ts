/**
 * Forge - The fluent authoring layer for Sharpee
 * 
 * This package provides a high-level, fluent API for creating interactive fiction
 * stories. It's designed to be approachable for non-programming authors while
 * maintaining the full power of the underlying Sharpee core.
 * 
 * Example usage:
 * 
 * ```typescript
 * import { forge, US_EN } from '@sharpee/forge';
 * 
 * const story = forge()
 *   .languageSet(US_EN)
 *   .title("The Mysterious Key")
 *   .startIn("library")
 *   
 *   .room("library")
 *     .description("A dusty old library with towering bookshelves.")
 *     .item("brass-key").description("A small brass key").takeable().done()
 *     .exit("north", "hallway")
 *     .done()
 *   
 *   .room("hallway") 
 *     .description("A long corridor with paintings on the walls.")
 *     .exit("south", "library")
 *     .done()
 *   
 *   .build()
 *   .start();
 * ```
 */

// Main API exports
export { forge, Forge, ForgeConfig } from './forge';
export { ForgeStory, ForgeStoryOptions } from './forge-story';

// Builder exports
export { LocationBuilder, ItemBuilder, CharacterBuilder } from './builders';

// Re-export important types from core for convenience
export { SupportedLanguage, US_EN } from '@sharpee/core/src/languages';
export { IFEntityType, Direction } from '@sharpee/core';

// Export types that were already defined
export * from './types';

// Version
export const version = '0.1.0';

// Default export for convenience
export { forge as default } from './forge';
