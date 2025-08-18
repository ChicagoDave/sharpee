/**
 * Text service interface for Interactive Fiction
 * 
 * Text services are responsible for generating output after each turn.
 * They have access to the game context and can query events, entities,
 * and spatial relationships to build appropriate output.
 */

import type { ISemanticEvent } from '@sharpee/core';
import type { LanguageProvider } from '@sharpee/if-domain';
import type { WorldModel, IFEntity } from '@sharpee/world-model';

/**
 * Game context provided to text service
 */
export interface TextServiceContext {
  /**
   * Current turn number
   */
  currentTurn: number;
  
  /**
   * Get events for the current turn
   */
  getCurrentTurnEvents(): ISemanticEvent[];
  
  /**
   * Get events by type for the current turn
   */
  getEventsByType(type: string): ISemanticEvent[];
  
  /**
   * Get all events (full history)
   */
  getAllEvents(): ISemanticEvent[];
  
  /**
   * Access to world model for entity queries
   */
  world: WorldModel;
  
  /**
   * Get the player entity
   */
  getPlayer(): IFEntity;
  
  /**
   * Get entities in a location
   */
  getContents(locationId: string): IFEntity[];
  
  /**
   * Get location of an entity
   */
  getLocation(entityId: string): string | null;
  
  /**
   * Get platform events for the current turn (optional)
   * These are debug/system events from parser, world model, etc.
   */
  getPlatformEvents?(): ISemanticEvent[];
}

/**
 * Output format for different client types
 */
export type TextOutput = 
  | string                    // Plain text for CLI
  | TextOutputJSON           // Structured for web/rich clients
  | TextOutputChanneled;     // Multi-channel output

/**
 * JSON output for web/rich clients
 */
export interface TextOutputJSON {
  type: 'json';
  main: string;
  metadata?: {
    turn: number;
    location?: string;
    score?: number;
    moves?: number;
  };
  sections?: {
    room?: string;
    inventory?: string[];
    exits?: string[];
    objects?: string[];
  };
  styling?: {
    roomName?: string;
    important?: string[];
  };
}

/**
 * Multi-channel output
 */
export interface TextOutputChanneled {
  type: 'channeled';
  channels: Map<string, string>;
}

/**
 * Text service interface
 */
export interface TextService {
  /**
   * Initialize with context
   */
  initialize(context: TextServiceContext): void;
  
  /**
   * Process the current turn and generate output
   * @returns The formatted output
   */
  processTurn(): TextOutput;
  
  /**
   * Set the language provider for template resolution
   * @param provider The language provider
   */
  setLanguageProvider(provider: LanguageProvider): void;
  
  /**
   * Get the current language provider
   * @returns The language provider or null if not set
   */
  getLanguageProvider(): LanguageProvider | null;
  
  /**
   * Set output format preference
   * @param format The desired output format
   */
  setOutputFormat?(format: 'text' | 'json' | 'channeled'): void;
}

/**
 * Text service configuration
 */
export interface TextServiceConfig {
  /**
   * Output format (defaults to 'text')
   */
  outputFormat?: 'text' | 'json' | 'channeled';
  
  /**
   * Whether to include debug information in output
   */
  debug?: boolean;
  
  /**
   * Custom event processors by event type
   */
  processors?: Record<string, (event: ISemanticEvent, context: TextServiceContext) => string | null>;
  
  /**
   * Channels to use for channeled output
   */
  channels?: string[];
}
