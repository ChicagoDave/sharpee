// packages/core/src/extensions/types.ts

import { ISemanticEvent } from '../events/types';

/**
 * Base interface for all extensions
 */
export interface IExtension {
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
export interface ICommandExtension extends IExtension {
  /**
   * Verbs that this extension can handle
   */
  verbs: string[];
}

/**
 * Extension for abilities (generic)
 * The IF-specific version with GameContext is in stdlib
 */
export interface IAbilityExtension extends IExtension {
  /**
   * Name of the ability
   */
  abilityName: string;
}

/**
 * Extension for event processing (generic)
 * The IF-specific version with GameContext is in stdlib
 */
export interface IEventExtension extends IExtension {
  /**
   * Event types that this extension handles
   */
  eventTypes: string[];
  
  /**
   * Process an event
   */
  processEvent: (event: ISemanticEvent) => ISemanticEvent[];
}

/**
 * Extension for parser enhancements (generic)
 * The IF-specific version with ParsedCommand is in stdlib
 */
export interface IParserExtension extends IExtension {
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
  | ICommandExtension
  | IAbilityExtension
  | IEventExtension
  | IParserExtension;
