// packages/core/src/execution/types.ts

import { ParsedCommand } from '../parser/core/types';
import { Entity, EntityId, WorldState } from '../world-model/types';
import { SemanticEvent } from '../events/types';

/**
 * The result of executing a command
 */
export interface CommandResult {
  /**
   * Whether the command was successful
   */
  success: boolean;

  /**
   * Events generated during command execution
   */
  events: SemanticEvent[];

  /**
   * Error message if the command failed
   */
  error?: string;

  /**
   * Additional metadata about the command execution
   */
  metadata?: Record<string, unknown>;
}

/**
 * Context object for command execution
 */
export interface GameContext {
  /**
   * The current world state
   */
  worldState: WorldState;

  /**
   * The player entity
   */
  player: Entity;

  /**
   * The current location entity
   */
  currentLocation: Entity;

  /**
   * Function to get an entity by ID
   */
  getEntity: (id: EntityId) => Entity | undefined;

  /**
   * Function to get entities by type
   */
  getEntitiesByType: (type: string) => Entity[];

  /**
   * Function to get entities with a specific relationship to an entity
   */
  getRelatedEntities: (entityId: EntityId, relationshipType: string) => Entity[];

  /**
   * Function to check if an entity is accessible to the player
   */
  isAccessible: (entityId: EntityId) => boolean;

  /**
   * Function to check if an entity is visible to the player
   */
  isVisible: (entityId: EntityId) => boolean;

  /**
   * Function to find an entity by name
   */
  findEntityByName: (name: string, options?: {
    location?: EntityId;
    includeInventory?: boolean;
    typeFilter?: string[];
  }) => Entity | undefined;

  /**
   * Function to find entities by name (for when there are multiple matches)
   */
  findEntitiesByName: (name: string, options?: {
    location?: EntityId;
    includeInventory?: boolean;
    typeFilter?: string[];
  }) => Entity[];

  /**
   * Function to update the world state (returns a new context)
   */
  updateWorldState: (updater: (state: WorldState) => WorldState) => GameContext;
}

/**
 * Interface for command handlers
 */
export interface CommandHandler {
  /**
   * The verb or verbs that this handler can process
   */
  verbs: string[];

  /**
   * Check if this handler can handle the given command
   */
  canHandle: (command: ParsedCommand, context: GameContext) => boolean;

  /**
   * Execute the command
   */
  execute: (command: ParsedCommand, context: GameContext) => Promise<CommandResult> | CommandResult;

  /**
   * Validate the command before execution
   */
  validate?: (command: ParsedCommand, context: GameContext) => { valid: boolean; error?: string };
}

/**
 * Interface for command router
 */
export interface CommandRouter {
  /**
   * Register a command handler
   */
  registerHandler: (handler: CommandHandler) => void;

  /**
   * Unregister a command handler
   */
  unregisterHandler: (handler: CommandHandler) => void;

  /**
   * Get a handler for the command
   */
  getHandler: (command: ParsedCommand, context: GameContext) => CommandHandler | undefined;

  /**
   * Route and execute a command
   */
  execute: (command: ParsedCommand, context: GameContext) => Promise<CommandResult>;
}

/**
 * Interface for command handler factory
 */
export interface CommandHandlerFactory {
  /**
   * Create a standard command handler
   */
  createHandler: (config: {
    verbs: string[];
    canHandle?: (command: ParsedCommand, context: GameContext) => boolean;
    execute: (command: ParsedCommand, context: GameContext) => Promise<CommandResult> | CommandResult;
    validate?: (command: ParsedCommand, context: GameContext) => { valid: boolean; error?: string };
  }) => CommandHandler;
}

/**
 * Options for command execution
 */
export interface CommandExecutionOptions {
  /**
   * Whether to skip validation
   */
  skipValidation?: boolean;

  /**
   * Custom validation callback
   */
  customValidation?: (command: ParsedCommand, context: GameContext) => { valid: boolean; error?: string };

  /**
   * Pre-execution hooks
   */
  preExecute?: ((command: ParsedCommand, context: GameContext) => Promise<void> | void)[];

  /**
   * Post-execution hooks
   */
  postExecute?: ((result: CommandResult, command: ParsedCommand, context: GameContext) => Promise<CommandResult> | CommandResult)[];
}