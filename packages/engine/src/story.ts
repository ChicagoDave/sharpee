/**
 * Story configuration and interfaces
 */

import { WorldModel, IFEntity } from '@sharpee/world-model';
import { LanguageProvider } from '@sharpee/if-domain';
import { TextService } from '@sharpee/if-services';

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
   * Language code (e.g., "en-us", "es-es")
   * Used to load the appropriate language package
   */
  language: string;
  
  /**
   * Text service configuration
   */
  textService?: {
    /**
     * Text service type (e.g., "template", "direct", "custom")
     * Defaults to "template" if not specified
     */
    type?: string;
    
    /**
     * Text service package name (for custom implementations)
     * e.g., "@mycompany/my-text-service"
     */
    package?: string;
    
    /**
     * Configuration to pass to the text service
     */
    config?: Record<string, any>;
  };
  
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
}

/**
 * Validate story configuration
 */
export function validateStoryConfig(config: StoryConfig): void {
  if (!config.id || !config.title || !config.author || !config.version || !config.language) {
    throw new Error('Missing required story configuration fields');
  }
  
  // Validate semantic version
  const versionRegex = /^\d+\.\d+\.\d+$/;
  if (!versionRegex.test(config.version)) {
    throw new Error('Invalid version format. Must be semantic version (e.g., 1.0.0)');
  }
}

/**
 * Helper to load a language provider based on language code
 */
export async function loadLanguageProvider(languageCode: string): Promise<LanguageProvider> {
  if (!languageCode) {
    throw new Error('Language code is required');
  }
  
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
  } catch (error: any) {
    if (error.message?.includes('Cannot find module')) {
      throw new Error(`Unsupported language: ${languageCode}`);
    }
    throw new Error(`Failed to load language package ${packageName}: ${error.message}`);
  }
}

/**
 * Helper to load a text service based on configuration
 */
export async function loadTextService(config?: StoryConfig['textService']): Promise<TextService> {
  const type = config?.type || 'template';
  // Use the unified text-services package by default
  const packageName = config?.package || '@sharpee/text-services';
  const serviceConfig = config?.config || {};
  
  try {
    // Special handling for test environment
    if (packageName === '@sharpee/text-service-template' && process.env.NODE_ENV === 'test') {
      // Use mock text service for tests
      const { createMockTextService } = await import('./test-helpers/mock-text-service');
      return createMockTextService();
    }
    
    // Dynamic import of the text service package
    const serviceModule = await import(packageName);
    
    // Try different export patterns
    let service: TextService;
    
    // Look for a factory function
    if (typeof serviceModule.createTextService === 'function') {
      service = serviceModule.createTextService(type, serviceConfig);
    }
    // Look for a default export that's a class
    else if (serviceModule.default && typeof serviceModule.default === 'function') {
      const ServiceClass = serviceModule.default;
      service = new ServiceClass(serviceConfig);
    }
    // Look for a named export that's a class
    else if (serviceModule.TextService && typeof serviceModule.TextService === 'function') {
      const ServiceClass = serviceModule.TextService;
      service = new ServiceClass(serviceConfig);
    }
    // Look for any class ending with TextService
    else {
      const serviceClasses = Object.entries(serviceModule)
        .filter(([name, value]) => 
          name.endsWith('TextService') && 
          typeof value === 'function'
        );
      
      if (serviceClasses.length > 0) {
        const [, ServiceClass] = serviceClasses[0];
        service = new (ServiceClass as any)(serviceConfig);
      } else {
        throw new Error(`No text service implementation found in ${packageName}`);
      }
    }
    
    return service;
  } catch (error: any) {
    if (error.message?.includes('Cannot find module')) {
      throw new Error(`Text service package not found: ${packageName}`);
    }
    throw new Error(`Failed to load text service ${packageName}: ${error.message}`);
  }
}
