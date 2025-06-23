// packages/core/src/execution/types.ts

import { SemanticEvent } from '../events/types';
import { TextService } from '../events/text-processor';
import { LanguageProvider } from '../language';

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
 * Generic parsed command interface
 * The actual implementation with IF-specific details is in stdlib
 */
export interface ParsedCommand {
  /**
   * The raw command text
   */
  raw: string;

  /**
   * The command verb
   */
  verb?: string;

  /**
   * Additional command data
   */
  [key: string]: any;
}

/**
 * Generic context interface for command execution
 * The actual GameContext with IF-specific details is in stdlib
 */
export interface ExecutionContext {
  /**
   * The text service for processing events into text
   */
  textService: TextService;

  /**
   * The language provider for text templates
   */
  languageProvider: LanguageProvider;

  /**
   * Additional context data
   */
  [key: string]: any;
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
  canHandle: (command: ParsedCommand, context: ExecutionContext) => boolean;

  /**
   * Execute the command
   */
  execute: (command: ParsedCommand, context: ExecutionContext) => Promise<CommandResult> | CommandResult;

  /**
   * Validate the command before execution
   */
  validate?: (command: ParsedCommand, context: ExecutionContext) => { valid: boolean; error?: string };
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
  getHandler: (command: ParsedCommand, context: ExecutionContext) => CommandHandler | undefined;

  /**
   * Route and execute a command
   */
  execute: (command: ParsedCommand, context: ExecutionContext, options?: CommandExecutionOptions) => Promise<CommandResult>;

  /**
   * Process the result of command execution and return text output
   */
  processResult?: (result: CommandResult) => string;
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
    canHandle?: (command: ParsedCommand, context: ExecutionContext) => boolean;
    execute: (command: ParsedCommand, context: ExecutionContext) => Promise<CommandResult> | CommandResult;
    validate?: (command: ParsedCommand, context: ExecutionContext) => { valid: boolean; error?: string };
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
  customValidation?: (command: ParsedCommand, context: ExecutionContext) => { valid: boolean; error?: string };

  /**
   * Pre-execution hooks
   */
  preExecute?: ((command: ParsedCommand, context: ExecutionContext) => Promise<void> | void)[];

  /**
   * Post-execution hooks
   */
  postExecute?: ((result: CommandResult, command: ParsedCommand, context: ExecutionContext) => Promise<CommandResult> | CommandResult)[];
}
