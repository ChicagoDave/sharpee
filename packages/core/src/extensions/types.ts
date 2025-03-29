// packages/core/src/extensions/types.ts

import { ParsedCommand } from '../parser/core/types';
import { CommandResult, GameContext } from '../execution/types';
import { EntityId, WorldState } from '../world-model/types';
import { ChannelDefinition } from '../channels/types';
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
 * Extension for command handling
 */
export interface CommandExtension extends Extension {
  /**
   * Verbs that this extension can handle
   */
  verbs: string[];
  
  /**
   * Check if this extension can handle a command
   */
  canHandle: (command: ParsedCommand, context: GameContext) => boolean;
  
  /**
   * Execute a command
   */
  execute: (command: ParsedCommand, context: GameContext) => Promise<CommandResult> | CommandResult;
  
  /**
   * Validate a command (optional)
   */
  validate?: (command: ParsedCommand, context: GameContext) => { valid: boolean; error?: string };
}

/**
 * Extension for character abilities
 */
export interface AbilityExtension extends Extension {
  /**
   * Check if the ability can be used
   */
  canUse: (context: GameContext, target?: EntityId) => boolean;
  
  /**
   * Execute the ability
   */
  execute: (context: GameContext, target?: EntityId) => Promise<CommandResult> | CommandResult;
  
  /**
   * Initialize the ability (called once when registering)
   */
  initialize: (context: GameContext) => void;
}

/**
 * Extension for adding content channels
 */
export interface ChannelExtension extends Extension {
  /**
   * Channel definitions provided by this extension
   */
  channelDefinitions: ChannelDefinition[];
}

/**
 * Extension for world model features
 */
export interface WorldModelExtension extends Extension {
  /**
   * Initialize extension state
   */
  initialize: (state: WorldState) => WorldState;
  
  /**
   * Clean up extension state
   */
  cleanup?: (state: WorldState) => WorldState;
  
  /**
   * Process state changes 
   */
  processStateChange?: (prevState: WorldState, nextState: WorldState) => WorldState;
}

/**
 * Extension for event processing
 */
export interface EventExtension extends Extension {
  /**
   * Event types that this extension handles
   */
  eventTypes: string[];
  
  /**
   * Process an event
   */
  processEvent: (event: SemanticEvent, context: GameContext) => SemanticEvent[];
}

/**
 * Extension for parser enhancements
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
  
  /**
   * Post-processing hook for parsed commands
   */
  postProcessCommand?: (command: ParsedCommand) => ParsedCommand;
}

/**
 * Extension types enum
 */
export enum ExtensionType {
  COMMAND = 'command',
  ABILITY = 'ability',
  CHANNEL = 'channel',
  WORLD_MODEL = 'world_model',
  EVENT = 'event',
  PARSER = 'parser'
}

/**
 * Union type for all extension types
 */
export type AnyExtension = 
  | CommandExtension
  | AbilityExtension
  | ChannelExtension
  | WorldModelExtension
  | EventExtension
  | ParserExtension;