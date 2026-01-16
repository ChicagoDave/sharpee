/**
 * Story configuration and interfaces
 */

import { WorldModel, IFEntity, IGameEvent, SimpleEventHandler } from '@sharpee/world-model';
import { LanguageProvider } from '@sharpee/if-domain';
import { Parser } from '@sharpee/stdlib';
import { EventEmitter } from './events/event-emitter';
import { ISemanticEvent } from '@sharpee/core';
import type { GameEngine } from './game-engine';
import { NarrativeConfig } from './narrative';

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

  /**
   * Narrative settings (perspective, tense)
   *
   * ADR-089: Controls how the story narrates player actions.
   * Defaults to 2nd person present tense ("You take the lamp").
   *
   * @example
   * // 1st person narrative (Anchorhead-style)
   * narrative: { perspective: '1st' }
   *
   * @example
   * // 3rd person with specific pronouns
   * narrative: { perspective: '3rd', playerPronouns: PRONOUNS.SHE_HER }
   */
  narrative?: NarrativeConfig;

  /**
   * Implicit action settings (ADR-104)
   *
   * Controls automatic inference and implicit actions like "first taking".
   * All default to true.
   *
   * @example
   * // Disable all implicit behavior (strict mode)
   * implicitActions: { inference: false, implicitTake: false }
   *
   * @example
   * // Allow inference but disable implicit take
   * implicitActions: { implicitTake: false }
   */
  implicitActions?: {
    /**
     * Whether to infer alternative targets when pronouns fail requirements.
     * Example: "read it" (it=mailbox) infers leaflet if only readable thing.
     * Default: true
     */
    inference?: boolean;

    /**
     * Whether to automatically take items when actions require holding them.
     * Example: "read leaflet" auto-takes if not held.
     * Default: true
     */
    implicitTake?: boolean;
  };
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

  /**
   * Called after the engine is fully initialized (optional).
   * Use this to register parsed command transformers or other engine hooks.
   *
   * @param engine - The fully initialized game engine
   */
  onEngineReady?(engine: GameEngine): void;
}

/**
 * Extended story class with event handling capabilities
 */
export class StoryWithEvents implements Story {
  config: StoryConfig;
  private eventEmitter: EventEmitter;
  
  constructor(config: StoryConfig) {
    this.config = config;
    this.eventEmitter = new EventEmitter();
  }
  
  /**
   * Register a story-level event handler (daemon)
   */
  on(eventType: string, handler: SimpleEventHandler): void {
    this.eventEmitter.on(eventType, handler);
  }
  
  /**
   * Remove a story-level event handler
   */
  off(eventType: string, handler: SimpleEventHandler): void {
    this.eventEmitter.off(eventType, handler);
  }
  
  /**
   * Emit an event to story-level handlers
   * Returns any semantic events generated by handlers
   */
  emit(event: IGameEvent): ISemanticEvent[] {
    return this.eventEmitter.emit(event);
  }
  
  // Abstract methods that must be implemented by subclasses
  initializeWorld(world: WorldModel): void {
    throw new Error('initializeWorld must be implemented');
  }
  
  createPlayer(world: WorldModel): IFEntity {
    throw new Error('createPlayer must be implemented');
  }
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

