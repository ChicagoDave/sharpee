/**
 * Story configuration and interfaces
 */

import { WorldModel, IFEntity } from '@sharpee/world-model';
import { LanguageProvider } from '@sharpee/stdlib';

/**
 * Story configuration
 */
export interface StoryConfig {
  /**
   * Story title
   */
  title: string;
  
  /**
   * Story author(s)
   */
  author: string | string[];
  
  /**
   * Story version
   */
  version: string;
  
  /**
   * Language code (e.g., "en-us", "es-es")
   * Used to load the appropriate language package
   */
  language: string;
  
  /**
   * Story description
   */
  description?: string;
  
  /**
   * Release date
   */
  releaseDate?: Date;
  
  /**
   * Custom configuration
   */
  custom?: Record<string, any>;
}

/**
 * Story interface - what a story module exports
 */
export interface Story {
  /**
   * Story configuration
   */
  config: StoryConfig;
  
  /**
   * Initialize the world for this story
   */
  initializeWorld(world: WorldModel): void;
  
  /**
   * Create the player entity
   */
  createPlayer(world: WorldModel): IFEntity;
  
  /**
   * Get custom actions for this story (optional)
   */
  getCustomActions?(): any[];
  
  /**
   * Story-specific initialization (optional)
   */
  initialize?(): void;
  
  /**
   * Check if the story is complete (optional)
   */
  isComplete?(): boolean;
}

/**
 * Helper to load a language provider based on language code
 */
export async function loadLanguageProvider(languageCode: string): Promise<LanguageProvider> {
  // Convert language code to package name (e.g., "en-us" -> "lang-en-us")
  const packageName = `@sharpee/lang-${languageCode.toLowerCase()}`;
  
  try {
    // Dynamic import of the language package
    const langModule = await import(packageName);
    
    // Language packages should export a default language provider
    if (langModule.default && typeof langModule.default === 'object') {
      return langModule.default as LanguageProvider;
    }
    
    // Or they might export a createLanguageProvider function
    if (typeof langModule.createLanguageProvider === 'function') {
      return langModule.createLanguageProvider();
    }
    
    throw new Error(`Language package ${packageName} does not export a valid language provider`);
  } catch (error) {
    throw new Error(`Failed to load language package ${packageName}: ${error}`);
  }
}
