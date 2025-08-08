/**
 * Story configuration and interfaces
 */

import { WorldModel, IFEntity } from '@sharpee/world-model';
import { LanguageProvider } from '@sharpee/if-domain';
import { TextService } from '@sharpee/if-services';
import { Parser } from '@sharpee/stdlib';

/**
 * Story configuration
 */
export interface StoryConfig {
  /**
   * Story ID
   */
  id: string;
  
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
   * Story description
   */
  description?: string;
  
  /**
   * Website URL
   */
  website?: string;
  
  /**
   * Contact email
   */
  email?: string;
  
  /**
   * Story tags
   */
  tags?: string[];
  
  /**
   * IFID (Interactive Fiction ID)
   */
  ifid?: string;
  
  /**
   * License
   */
  license?: string;
  
  /**
   * Release date
   */
  releaseDate?: string;
  
  /**
   * Custom configuration
   */
  custom?: Record<string, any>;
}

/**
 * Custom vocabulary that a story can provide
 */
export interface CustomVocabulary {
  /**
   * Custom verbs for this story
   */
  verbs?: Array<{
    actionId: string;
    verbs: string[];
    pattern?: string;
    prepositions?: string[];
  }>;
  
  /**
   * Custom nouns (future expansion)
   */
  nouns?: Array<{
    word: string;
    entityId?: string;
    priority?: number;
  }>;
  
  /**
   * Custom adjectives (future expansion)
   */
  adjectives?: Array<{
    word: string;
    entityId?: string;
  }>;
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
   * Get custom vocabulary for this story (optional)
   * Called after story initialization to register custom verbs, nouns, etc.
   */
  getCustomVocabulary?(): CustomVocabulary;
  
  /**
   * Story-specific initialization (optional)
   */
  initialize?(): void;
  
  /**
   * Check if the story is complete (optional)
   */
  isComplete?(): boolean;
  
  /**
   * Extend the parser with story-specific vocabulary (optional)
   */
  extendParser?(parser: Parser): void;
  
  /**
   * Extend the language provider with story-specific messages (optional)
   */
  extendLanguage?(language: LanguageProvider): void;
}

/**
 * Validate story configuration
 */
export function validateStoryConfig(config: StoryConfig): void {
  if (!config.id || !config.title || !config.author || !config.version) {
    throw new Error('Missing required story configuration fields');
  }
  
  // Validate semantic version
  const versionRegex = /^\d+\.\d+\.\d+$/;
  if (!versionRegex.test(config.version)) {
    throw new Error('Invalid version format. Must be semantic version (e.g., 1.0.0)');
  }
}

