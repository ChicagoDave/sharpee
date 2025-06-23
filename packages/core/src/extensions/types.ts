// packages/core/src/extensions/types.ts

import { SemanticEvent } from '../events/types';

/**
 * Base interface for all extensions
 */
export interface Extension {
  /**
   * Unique identifier for this extension
   */
  id: string;
  
  /**
   * Human-readable name of the extension
   */
  name: string;
  
  /**
   * Version of the extension
   */
  version?: string;
  
  /**
   * Extension dependencies
   */
  dependencies?: string[];
}

/**
 * Extension for command handling (generic)
 * The IF-specific version with ParsedCommand and GameContext is in stdlib
 */
export interface CommandExtension extends Extension {
  /**
   * Verbs that this extension can handle
   */
  verbs: string[];
}

/**
 * Extension for abilities (generic)
 * The IF-specific version with GameContext is in stdlib
 */
export interface AbilityExtension extends Extension {
  /**
   * Name of the ability
   */
  abilityName: string;
}

/**
 * Extension for event processing (generic)
 * The IF-specific version with GameContext is in stdlib
 */
export interface EventExtension extends Extension {
  /**
   * Event types that this extension handles
   */
  eventTypes: string[];
  
  /**
   * Process an event
   */
  processEvent: (event: SemanticEvent) => SemanticEvent[];
}

/**
 * Extension for parser enhancements (generic)
 * The IF-specific version with ParsedCommand is in stdlib
 */
export interface ParserExtension extends Extension {
  /**
   * Grammar rules, dictionaries, etc.
   */
  vocabulary?: Record<string, string[]>;
  
  /**
   * Pre-processing hook for input text
   */
  preProcessInput?: (input: string) => string;
}

/**
 * Extension types enum
 */
export enum ExtensionType {
  COMMAND = 'command',
  ABILITY = 'ability',
  EVENT = 'event',
  PARSER = 'parser'
}

/**
 * Union type for all extension types
 */
export type AnyExtension = 
  | CommandExtension
  | AbilityExtension
  | EventExtension
  | ParserExtension;
